# ETF Planner

A personal, static single-page ETF planner for comparing, combining and planning a long-term (15+ years) sustainable ETF portfolio. No build step, no dependencies, no frameworks – plain HTML/CSS/JS.

## Usage

1. Open `index.html`.
2. Enter a WKN plus an amount to build your portfolio and monthly savings plan.
3. Review the projection table, adjust return assumptions, and switch language (DE/EN) or theme as needed.

All data stays local in your browser (`localStorage`); nothing leaves your machine. Export/import via JSON works from the header menu.

## Data

`data.js` holds `ETF_DATA`, a static snapshot and the single source of truth for all ETF master data. Refresh all known ETFs with:

```bash
python3 tools/update-etf-data.py
```

To add a new ETF, pass its WKN/ISIN; the script fetches current figures and rewrites `data.js`:

```bash
python3 tools/update-etf-data.py IE0001GSQ2O9 LU0908501058 IE00BHZPJ239
```

> Not investment advice. Past performance does not guarantee future results.
