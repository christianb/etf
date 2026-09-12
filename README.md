# ETF Planner

A personal, static ETF planner (single page) for comparing, combining and planning a selection of ETFs. Long-term investment horizon (15+ years), sustainability matters (Paris-Aligned / CTB preferred), execution always in EUR on XETRA.

## Features

- **My portfolio** – row editor for holdings (WKN/ISIN + amount), live portfolio value and stacked region bar (North America, Europe, Asia, South America, Africa, Australia/Oceania).
- **Monthly savings plan** – same row editor for monthly purchases, region split as bar and table.
- **Portfolio growth** – transposed projection table (today up to +10 years) based on monthly compound interest, including region drift. Per-ETF return assumptions editable (default 8/7/8.5 %).
- **Recommended target allocation** – 65 % Americas / 15 % Europe / 16 % Asia / 4 % rest of the world (global market capitalization, FTSE All-World / MSCI ACWI).
- **Light/dark mode**, **export/import** as JSON file, local persistence via `localStorage` (`etfplaner.v1`).
- **DE/EN language switcher** – all UI strings and region labels switch between German and English; number formats follow the selected language (de-DE / en-GB).

## Quick start

No build step, no dependencies, no frameworks – plain vanilla HTML/CSS/JS.

1. Open `index.html` by double-clicking (`file://`).
2. Enter a WKN or ISIN plus an amount. Duplicate WKNs are automatically merged into the existing row when you press "+".
3. Data is only stored locally in your browser – nothing leaves your machine.

## Project structure

| File | Content |
|---|---|
| `index.html` | The single "Planner" page (Portfolio · Savings plan · Projection) |
| `data.js` | `ETF_DATA` – static snapshot (single source of truth) |
| `calc.js` | Pure calculation logic (DOM-free): `aggregate()`, `solve()`, `project()`, `macroOf()`, `parseEuro()`, `parseHoldings()` |
| `i18n.js` | DE/EN localization (dictionary `I18N.strings`, `t()`/`tpl()`, `setLang()`/`applyLang()`) |
| `shared.js` | Shared globals (`ETFS`, colors, formatting, world-map engine) |
| `planen.js` | Interactive UI logic (row editors, projection, export/import) |
| `style.css` | CSS variables + global styles (light/dark via `data-mode`) |
| `tools/` | `update-etf-data.py` (data refresh), `gen-world-grid.js` + `countries.geo.json` (world-map raster) |

Script order: `data.js → calc.js → i18n.js → shared.js → planen.js`.

## Updating the data

```bash
python3 tools/update-etf-data.py IE0001GSQ2O9 LU0908501058 IE00BHZPJ239
```

Run without arguments to update **all known ETFs** from `data.js` instead:

```bash
python3 tools/update-etf-data.py
```

The script fetches current figures (`_payload.json`) and rewrites `data.js`. New ETFs are detected automatically – afterwards please review the manual fields (`id`, `color`, `defaultRate`, `marketType`, `shortName`).

## Legal disclaimer

Not investment advice. Static data (snapshot) – past performance does not guarantee future results. Inputs are only stored locally in your browser.