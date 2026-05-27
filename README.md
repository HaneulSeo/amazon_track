# Mighty Patch Revenue Tracker

Amazon / Jungle Scout CSV exports are transformed into a Vercel-ready tracker dashboard. The main screen is intentionally minimal and shows Amazon Tracker as the entry module. Inside Amazon Tracker, users first see all tracked industries, then open an industry to view company summaries, then open a company such as Mighty Patch for detailed revenue, product, benchmark, and raw-data analysis.

## Data Location

Put source CSV files in:

```txt
data/raw/amazon_us/coway/*.csv
data/raw/amazon_us/samyang/*.csv
data/raw/amazon_us/tnl/*.csv
```

The build pipeline reads every CSV under `data/raw/amazon_us` and standardizes them by company, ASIN, and month. It also consumes processed DART / TRASS trade outputs when present. No login automation, web crawling, or account access automation is used.

If you need to regenerate the DART and TRASS-derived files from the manual xlsx sources, set `DART_API_KEY` and run:

```bash
python3 scripts/extract_external_trade_data.py
```

## Supported Columns

The build script automatically maps common column variants:

- `ASIN`, `Product ASIN`
- `Product Name`, `Title`, `Product Title`
- `Brand`
- `Category`
- `Price`, `Buy Box Price`, `Average Price`
- `Monthly Sales`, `Unit Sales`, `Estimated Sales`, `Units Sold`
- `Monthly Revenue`, `Revenue`, `Estimated Revenue`
- `Rank`, `BSR`, `Sales Rank`
- `Reviews`, `Review Count`
- `Rating`, `Star Rating`
- `Sellers`, `Seller Count`
- `Date`, `Month`, `Snapshot Date`, `Tracking Date`

If revenue is missing, it is estimated as `price * unit sales`. Numeric values such as `$12.99`, `10,000`, `1.2K`, `3M`, percentages, and `N.A.` are normalized automatically.

## Date Handling

The script first looks for a date-like column. If no date column exists, it tries to parse a date from the filename. If neither is available, it uses the file modified date and records a warning in `public/data/summary.json`.

For Catalyst historical exports with daily rows, each row is treated as a daily snapshot of a monthly estimate. Product-month revenue and unit sales are averaged inside the month, then summed across products for the brand trend. This avoids inflating revenue by summing repeated daily monthly estimates.

## Local Setup

```bash
npm install
npm run build:data
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

Useful scripts:

- `npm run build:data`: reads `data/raw/*.csv` and writes dashboard JSON
- `npm run dev`: starts the local Next.js server
- `npm run build`: regenerates data and builds the Next.js app
- `npm run lint`: runs Next.js linting

Generated files:

- `data/processed/amazon_us_monthly.csv`
- `data/processed/company_monthly_proxy.csv`
- `data/processed/product_family_monthly.csv`
- `data/processed/company_coverage_score.csv`
- `data/processed/source_gap_map.csv`
- `data/processed/trass_trade_monthly.csv`
- `data/processed/trass_trade_quarterly.csv`
- `data/processed/trass_country_monthly.csv`
- `data/processed/dart_quarterly_revenue.csv`
- `data/processed/quarterly_comparison.csv`
- `public/data/dashboard_data.json`

## App Structure

- Main dashboard: shows only the Amazon Tracker entry module.
- Amazon Tracker overview: shows all tracked industries and average movement before selecting a sector.
- Industry pages: show company summaries inside sectors such as Beauty, Supplements, Food & Grocery, and Home.
- Company cards: Mighty Patch currently lives under Beauty and opens a dedicated company workspace.
- Company tabs: Overview, Products, Benchmark, and Data keep the company dashboard compact instead of one long report.
- Currency toggle: USD/KRW buttons convert tracked Amazon USD estimates and KRW benchmark revenue using the live USD/KRW rate from the app API route.

## Vercel Deployment

1. Push this repository to GitHub.
2. In Vercel, choose **Import Project** and connect the GitHub repository.
3. Set Framework Preset to **Next.js**.
4. Set Build Command to `npm run build`.
5. Leave Output Directory as the default.
6. Deploy.

To update the dashboard after changing CSVs, replace files in `data/raw`, run `npm run build:data` locally to verify, commit the changes, and push again.

## Important Notes

- Jungle Scout values are estimates, not audited actual revenue.
- This is not total Amazon revenue; it only reflects the tracked ASINs in `data/raw`.
- The quarterly benchmark now compares DART revenue in KRW against tracked Amazon US estimates, while TRASS country data is shown separately as export-momentum context.
- FX conversion uses a current USD/KRW API response when available and falls back to a static rate if the API is unavailable.
- If products are missing, brand-level revenue will be underestimated.
- Currency conversion, Amazon fees, returns, wholesale revenue, ad spend, and margin are not included.
- Product names are only as complete as the CSV export. If a CSV contains only ASIN metadata, the dashboard labels the product by ASIN.
- `DART_API_KEY` must never be committed; keep it in your local shell or Vercel environment variables only.
