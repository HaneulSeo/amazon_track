#!/usr/bin/env python3
"""
Extract manual TRASS xlsx files and DART quarterly revenue into processed CSVs.

This script is intentionally stdlib-only so it can run in constrained build
environments. It reads:
- data/raw/manual/*.xlsx
- DART Open API via DART_API_KEY

It writes:
- data/processed/trass_trade_monthly.csv
- data/processed/trass_trade_quarterly.csv
- data/processed/trass_country_monthly.csv
- data/processed/dart_quarterly_revenue.csv
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import json
import os
import re
import ssl
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW_MANUAL = ROOT / "data" / "raw" / "manual"
PROCESSED = ROOT / "data" / "processed"
NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

COMPANIES = {
    "samyang": "삼양식품",
    "tnl": "티앤엘",
}

REPORT_TO_QUARTER = {
    "11013": "Q1",
    "11012": "Q2",
    "11014": "Q3",
    "11011": "FY",
}


def normalize_number(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in {"#", "＃", "-", "--", "N/A", "NA"}:
        return None
    text = text.replace(",", "").replace("$", "").replace("₩", "").replace("%", "").replace(" ", "")
    try:
        return float(text)
    except Exception:
        return None


def excel_date_from_month(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def quarter_from_month(month: str) -> str:
    year, mon = month.split("-")
    q = (int(mon) - 1) // 3 + 1
    return f"{year}-Q{q}"


def cell_value(cell, shared):
    value = cell.find("a:v", NS)
    if value is not None and value.text is not None:
        raw = value.text
        if cell.attrib.get("t") == "s" and raw.isdigit():
            return shared[int(raw)]
        return raw
    inline = cell.find("a:is", NS)
    if inline is not None:
        return "".join(t.text or "" for t in inline.iterfind(".//a:t", NS))
    return ""


def read_xlsx_rows(path: Path):
    with zipfile.ZipFile(path) as zf:
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall("a:si", NS):
                shared.append("".join(t.text or "" for t in si.iterfind(".//a:t", NS)))

        # The manual workbooks have a single sheet.
        sheet_xml = zf.read("xl/worksheets/sheet1.xml")
        ws = ET.fromstring(sheet_xml)
        rows = []
        for row in ws.findall(".//a:sheetData/a:row", NS):
            values = {}
            for cell in row.findall("a:c", NS):
                ref = cell.attrib.get("r", "A1")
                col = re.match(r"([A-Z]+)", ref).group(1)
                values[col] = cell_value(cell, shared)
            rows.append(values)
        return rows


def parse_trass_xlsx(path: Path):
    rows = read_xlsx_rows(path)
    stem = path.stem
    company = "samyang" if stem.startswith("samyang") else "tnl"
    if company == "samyang":
        product_line = "ramen" if "ramen" in stem else "sauce"
        country_scope = "us" if stem.endswith("_us") else "cn" if stem.endswith("_cn") else "total"
    else:
        product_line = "patch"
        country_scope = "us" if stem.endswith("_us") else "total"

    source_descriptor = (rows[1].get("A") or "").strip() if len(rows) > 1 else ""
    year = None
    monthly = []
    for row in rows:
        label = (row.get("A") or "").strip()
        if re.fullmatch(r"\d{4}년", label):
            year = int(label[:4])
            continue
        if year is None:
            continue
        if "월" not in label:
            continue
        month_match = re.search(r"(\d{1,2})월", label)
        if not month_match:
            continue
        month = excel_date_from_month(year, int(month_match.group(1)))
        monthly.append(
            {
                "company": company,
                "company_label": COMPANIES[company],
                "product_line": product_line,
                "country_scope": country_scope,
                "source_file": path.name,
                "source_descriptor": source_descriptor,
                "month": month,
                "quarter": quarter_from_month(month),
                "export_value_usd": normalize_number(row.get("B")),
                "export_value_krw": normalize_number(row.get("C")),
                "export_weight_kg": normalize_number(row.get("D")),
                "domestic_company_count": normalize_number(row.get("E")),
                "foreign_counterparty_count": normalize_number(row.get("F")),
            }
        )
    return monthly


def group_quarterly(monthly_rows):
    buckets = defaultdict(lambda: {
        "export_value_usd": 0.0,
        "export_value_krw": 0.0,
        "export_weight_kg": 0.0,
        "domestic_company_count": 0.0,
        "foreign_counterparty_count": 0.0,
    })
    meta = {}
    for row in monthly_rows:
        key = (row["company"], row["product_line"], row["country_scope"], row["quarter"])
        meta[key] = row
        for field in buckets[key]:
            value = row.get(field)
            if isinstance(value, (int, float)):
                buckets[key][field] += float(value)

    output = []
    for (company, product_line, country_scope, quarter), values in buckets.items():
        output.append(
            {
                "company": company,
                "company_label": COMPANIES[company],
                "product_line": product_line,
                "country_scope": country_scope,
                "quarter": quarter,
                "export_value_usd": round(values["export_value_usd"], 2),
                "export_value_krw": round(values["export_value_krw"], 2),
                "export_weight_kg": round(values["export_weight_kg"], 3),
                "domestic_company_count": round(values["domestic_company_count"], 2),
                "foreign_counterparty_count": round(values["foreign_counterparty_count"], 2),
            }
        )
    output.sort(key=lambda row: (row["company"], row["product_line"], row["country_scope"], row["quarter"]))
    return output


def group_country_monthly(monthly_rows):
    buckets = defaultdict(lambda: {
        "export_value_usd": 0.0,
        "export_value_krw": 0.0,
        "export_weight_kg": 0.0,
    })
    for row in monthly_rows:
        key = (row["company"], row["country_scope"], row["month"])
        for field in buckets[key]:
            value = row.get(field)
            if isinstance(value, (int, float)):
                buckets[key][field] += float(value)

    output = []
    for (company, country_scope, month), values in buckets.items():
        output.append(
            {
                "company": company,
                "company_label": COMPANIES[company],
                "country_scope": country_scope,
                "month": month,
                "quarter": quarter_from_month(month),
                "export_value_usd": round(values["export_value_usd"], 2),
                "export_value_krw": round(values["export_value_krw"], 2),
                "export_weight_kg": round(values["export_weight_kg"], 3),
            }
        )
    output.sort(key=lambda row: (row["company"], row["country_scope"], row["month"]))
    return output


def fetch_json(url: str):
    ctx = ssl._create_unverified_context()
    with urllib.request.urlopen(url, context=ctx, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def load_dart_corp_map(api_key: str):
    ctx = ssl._create_unverified_context()
    url = f"https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key={api_key}"
    with urllib.request.urlopen(url, context=ctx, timeout=30) as response:
        blob = response.read()
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        xml = zf.read(zf.namelist()[0])
    root = ET.fromstring(xml)
    corp_map = {}
    for item in root.findall("list"):
        stock = (item.findtext("stock_code") or "").strip()
        if stock in {"021240", "003230", "340570"}:
            corp_map[stock] = {
                "corp_code": (item.findtext("corp_code") or "").strip(),
                "corp_name": (item.findtext("corp_name") or "").strip(),
            }
    return corp_map


def pick_revenue_row(rows):
    for row in rows:
        account_id = row.get("account_id", "")
        account_nm = row.get("account_nm", "")
        if account_id == "ifrs-full_Revenue" or account_nm == "매출액" or "Revenue" == account_nm:
            return row
    # Fallback for non-standard naming.
    for row in rows:
        account_nm = row.get("account_nm", "")
        if "매출" in account_nm or "수익" in account_nm:
            if any(bad in account_nm for bad in ["매출채권", "매출원가", "매출총이익"]):
                continue
            return row
    return None


def parse_amount(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in {"-", "--", "null", "None"}:
        return None
    try:
        return float(text.replace(",", ""))
    except Exception:
        return None


def quarter_amount_from_report(row, report_code):
    quarter = REPORT_TO_QUARTER[report_code]
    if quarter == "FY":
        return parse_amount(row.get("thstrm_amount"))
    amount = parse_amount(row.get("thstrm_amount"))
    return amount


def collect_dart_quarterly(api_key: str, start_year: int = 2019, end_year: int = 2026):
    corp_map = load_dart_corp_map(api_key)
    company_rows = []
    stock_by_company = {"coway": "021240", "samyang": "003230", "tnl": "340570"}
    report_codes = ["11013", "11012", "11014", "11011"]
    for company, stock in stock_by_company.items():
        corp_code = corp_map[stock]["corp_code"]
        corp_name = corp_map[stock]["corp_name"]
        q_values = defaultdict(dict)
        q_meta = defaultdict(dict)
        annual_values = {}
        for year in range(start_year, end_year + 1):
            for report_code in report_codes:
                url = (
                    "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json"
                    f"?crtfc_key={api_key}&corp_code={corp_code}&bsns_year={year}&reprt_code={report_code}&fs_div=CFS"
                )
                data = fetch_json(url)
                if data.get("status") != "000":
                    # Fallback to OFS when consolidated is not available.
                    url = (
                        "https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json"
                        f"?crtfc_key={api_key}&corp_code={corp_code}&bsns_year={year}&reprt_code={report_code}&fs_div=OFS"
                    )
                    data = fetch_json(url)
                revenue_row = pick_revenue_row(data.get("list", []))
                if not revenue_row:
                    continue
                amount = quarter_amount_from_report(revenue_row, report_code)
                if amount is None:
                    continue
                row_key = f"{year}-{report_code}"
                q_meta[row_key] = {
                    "company": company,
                    "company_label": corp_name,
                    "corp_code": corp_code,
                    "stock_code": stock,
                    "year": year,
                    "report_code": report_code,
                    "rcept_no": revenue_row.get("rcept_no"),
                    "source_url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={revenue_row.get('rcept_no')}",
                }
                if report_code == "11011":
                    annual_values[year] = {
                        "amount": amount,
                        "revenue_row": revenue_row,
                    }
                else:
                    q_values[year][report_code] = {
                        "amount": amount,
                        "revenue_row": revenue_row,
                    }

        # Build quarter rows
        ordered = []
        for year in range(start_year, end_year + 1):
            q1 = q_values.get(year, {}).get("11013")
            q2 = q_values.get(year, {}).get("11012")
            q3 = q_values.get(year, {}).get("11014")
            annual = annual_values.get(year)
            if q1:
                ordered.append({
                    **q_meta.get(f"{year}-11013", {}),
                    "quarter": f"{year}-Q1",
                    "period_type": "quarter",
                    "revenue_krw": round(q1["amount"], 0),
                    "cumulative_revenue_krw": round(parse_amount(q1["revenue_row"].get("thstrm_add_amount")) or q1["amount"], 0),
                    "is_derived": False,
                })
            if q2:
                ordered.append({
                    **q_meta.get(f"{year}-11012", {}),
                    "quarter": f"{year}-Q2",
                    "period_type": "quarter",
                    "revenue_krw": round(q2["amount"], 0),
                    "cumulative_revenue_krw": round(parse_amount(q2["revenue_row"].get("thstrm_add_amount")) or q2["amount"], 0),
                    "is_derived": False,
                })
            if q3:
                ordered.append({
                    **q_meta.get(f"{year}-11014", {}),
                    "quarter": f"{year}-Q3",
                    "period_type": "quarter",
                    "revenue_krw": round(q3["amount"], 0),
                    "cumulative_revenue_krw": round(parse_amount(q3["revenue_row"].get("thstrm_add_amount")) or q3["amount"], 0),
                    "is_derived": False,
                })
            if annual and q1 and q2 and q3:
                q4_amount = annual["amount"] - q1["amount"] - q2["amount"] - q3["amount"]
                ordered.append({
                    **q_meta.get(f"{year}-11011", {}),
                    "quarter": f"{year}-Q4",
                    "period_type": "derived_q4",
                    "revenue_krw": round(q4_amount, 0),
                    "cumulative_revenue_krw": round(annual["amount"], 0),
                    "is_derived": True,
                })
        company_rows.extend(ordered)

    company_rows.sort(key=lambda row: (row["company"], row["quarter"]))
    return company_rows


def write_csv(path: Path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def main():
    if not RAW_MANUAL.exists():
        raise SystemExit(f"Missing manual raw directory: {RAW_MANUAL}")

    xlsx_files = sorted(RAW_MANUAL.glob("*.xlsx"))
    if not xlsx_files:
        raise SystemExit(f"No manual xlsx files found in {RAW_MANUAL}")

    monthly_rows = []
    for path in xlsx_files:
        monthly_rows.extend(parse_trass_xlsx(path))

    quarterly_rows = group_quarterly(monthly_rows)
    country_rows = group_country_monthly(monthly_rows)

    write_csv(
        PROCESSED / "trass_trade_monthly.csv",
        monthly_rows,
        [
            "company",
            "company_label",
            "product_line",
            "country_scope",
            "source_file",
            "source_descriptor",
            "month",
            "quarter",
            "export_value_usd",
            "export_value_krw",
            "export_weight_kg",
            "domestic_company_count",
            "foreign_counterparty_count",
        ],
    )

    write_csv(
        PROCESSED / "trass_trade_quarterly.csv",
        quarterly_rows,
        [
            "company",
            "company_label",
            "product_line",
            "country_scope",
            "quarter",
            "export_value_usd",
            "export_value_krw",
            "export_weight_kg",
            "domestic_company_count",
            "foreign_counterparty_count",
        ],
    )

    write_csv(
        PROCESSED / "trass_country_monthly.csv",
        country_rows,
        [
            "company",
            "company_label",
            "country_scope",
            "month",
            "quarter",
            "export_value_usd",
            "export_value_krw",
            "export_weight_kg",
        ],
    )

    api_key = os.environ.get("DART_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("DART_API_KEY is required to fetch quarterly revenue series")
    dart_rows = collect_dart_quarterly(api_key)
    write_csv(
        PROCESSED / "dart_quarterly_revenue.csv",
        dart_rows,
        [
            "company",
            "company_label",
            "corp_code",
            "stock_code",
            "year",
            "quarter",
            "period_type",
            "report_code",
            "rcept_no",
            "source_url",
            "revenue_krw",
            "cumulative_revenue_krw",
            "is_derived",
        ],
    )

    print(f"wrote {len(monthly_rows)} trass monthly rows")
    print(f"wrote {len(quarterly_rows)} trass quarterly rows")
    print(f"wrote {len(country_rows)} trass country-monthly rows")
    print(f"wrote {len(dart_rows)} dart quarterly rows")


if __name__ == "__main__":
    main()
