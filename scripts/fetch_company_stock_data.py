#!/usr/bin/env python3
from __future__ import annotations

import csv
import datetime as dt
import json
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / 'data' / 'processed'

COMPANIES = {
    'coway': {'label': 'Coway', 'ticker': '021240.KS'},
    'samyang': {'label': 'Samyang Foods', 'ticker': '003230.KS'},
    'tnl': {'label': 'T&L', 'ticker': '340570.KQ'},
}


def fetch_chart(ticker: str):
    params = urllib.parse.urlencode({
        'range': '5y',
        'interval': '1d',
        'includePrePost': 'false',
        'events': 'div,splits',
    })
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?{params}'
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        payload = json.loads(resp.read().decode('utf-8'))
    result = payload['chart']['result'][0]
    timestamps = result.get('timestamp', [])
    quote = result['indicators']['quote'][0]
    adjclose = result['indicators'].get('adjclose', [{}])[0].get('adjclose', [None] * len(timestamps))
    rows = []
    for idx, ts in enumerate(timestamps):
        close = quote.get('close', [None] * len(timestamps))[idx]
        volume = quote.get('volume', [None] * len(timestamps))[idx]
        adj = adjclose[idx] if idx < len(adjclose) else None
        if close is None and adj is None:
            continue
        date = dt.datetime.utcfromtimestamp(ts).date().isoformat()
        month = date[:7]
        rows.append({
            'date': date,
            'month': month,
            'close': close,
            'adj_close': adj if adj is not None else close,
            'volume': volume,
        })
    return rows


def month_end_rows(rows):
    month_map = {}
    for row in rows:
        month_map[row['month']] = row
    ordered = [month_map[key] for key in sorted(month_map)]
    base = None
    for row in ordered:
        value = row['adj_close'] if row['adj_close'] is not None else row['close']
        if value is not None:
            base = float(value)
            break
    output = []
    prev = None
    for row in ordered:
        value = row['adj_close'] if row['adj_close'] is not None else row['close']
        value = float(value) if value is not None else None
        month_return = None
        if value is not None and prev not in (None, 0):
            month_return = round(((value - prev) / prev) * 100, 2)
        index_100 = round((value / base) * 100, 2) if value is not None and base not in (None, 0) else None
        output.append({
            **row,
            'close': round(float(row['close']), 2) if row['close'] is not None else '',
            'adj_close': round(float(value), 2) if value is not None else '',
            'volume': int(row['volume']) if row['volume'] is not None else '',
            'month_return': month_return if month_return is not None else '',
            'index_100': index_100 if index_100 is not None else '',
        })
        prev = value if value is not None else prev
    return output


def write_csv(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ['company', 'company_label', 'stock_ticker', 'date', 'month', 'close', 'adj_close', 'volume', 'month_return', 'index_100']
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    all_rows = []
    for company, meta in COMPANIES.items():
        rows = month_end_rows(fetch_chart(meta['ticker']))
        for row in rows:
            row['company'] = company
            row['company_label'] = meta['label']
            row['stock_ticker'] = meta['ticker']
        all_rows.extend(rows)
    write_csv(PROCESSED / 'company_stock_monthly.csv', all_rows)
    print(f'wrote {len(all_rows)} stock monthly rows')


if __name__ == '__main__':
    main()
