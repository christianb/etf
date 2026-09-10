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

## The ETFs

Master data lives as a static snapshot in `data.js` (as of 2026-09-08, EUR/XETRA returns) and is the **single source of truth** – colors, default return assumptions, maps and projection are all derived from it.

| Role | ETF | ISIN / WKN | TER |
|---|---|---|---|
| Core (World DM) | Amundi MSCI World ESG Broad Transition Acc | IE0001GSQ2O9 / ETF142 | 0.20 % |
| Tilt (Eurozone) | Amundi MSCI EMU ESG Broad Transition Acc | LU0908501058 / LYX0Q1 | 0.12 % |
| EM satellite | iShares MSCI EM ESG Enhanced Acc | IE00BHZPJ239 / A2PCB0 | 0.18 % |
| Additional holding | iShares MSCI World SRI Acc | IE00BYX2JD69 / A2DVB9 | 0.20 % |
| Additional holding (Europe) | iShares MSCI Europe SRI Acc | IE00B52VJ196 / A1H7ZS | 0.20 % |

Example target allocation: **70 % World / 20 % EMU / 10 % EM** (≈ 54 % Americas / 30 % Europe / 10 % EM / 7 % rest in regions). Holdings are considered non-sellable – all models assume "buy only, never sell".

## Project structure

| File | Content |
|---|---|
| `index.html` | The single "Planner" page (Portfolio · Savings plan · Projection) |
| `data.js` | `ETF_DATA` – static snapshot from Finanzfluss/justETF (single source of truth) |
| `calc.js` | Pure calculation logic (DOM-free): `aggregate()`, `solve()`, `project()`, `macroOf()`, `parseEuro()`, `parseHoldings()` |
| `i18n.js` | DE/EN localization (dictionary `I18N.strings`, `t()`/`tpl()`, `setLang()`/`applyLang()`) |
| `shared.js` | Shared globals (`ETFS`, colors, formatting, world-map engine) |
| `planen.js` | Interactive UI logic (row editors, projection, export/import) |
| `style.css` | CSS variables + global styles (light/dark via `data-mode`) |
| `tools/` | `update-etf-data.py` (data refresh from Finanzfluss), `gen-world-grid.js` + `countries.geo.json` (world-map raster) |

Script order: `data.js → calc.js → i18n.js → shared.js → planen.js`.

### Region model

- **Fine regions**: North America, Europe, Asia, South America, Africa, Australia/Oceania (as published by Finanzfluss).
- **Macro buckets** (`macroOf()`): DM funds → Americas/Europe/rest; EM funds count fully as `em`.
- Region split in bars and projection = the fine regions; 0 % regions are hidden.

## Updating the data

```bash
python3 tools/update-etf-data.py IE0001GSQ2O9 LU0908501058 IE00BHZPJ239
```

The script fetches current figures from Finanzfluss (`_payload.json`) and rewrites `data.js`. New ETFs are detected automatically – afterwards please review the manual fields (`id`, `color`, `defaultRate`, `marketType`, `shortName`).

## Testing

Calculation logic (no browser needed):

```bash
node -e "
const fs=require('fs'); const C=require('./calc.js');
const D=new Function(fs.readFileSync('./data.js','utf8')+';return ETF_DATA;')();
const E=D.etfs.filter(e=>['world','emu','em'].includes(e.id));
const r=C.solve(E,{amerika:53.97,europa:29.76,em:10,rest:6.27},30000,[60000,20000,0]);
console.log(r.w.map(v=>Math.round(v)));"
# Expected ≈ [16935, 2227, 10838]
```

UI logic: `planen.js` (together with `data.js`, `calc.js`, `i18n.js`, `shared.js`) can be run in Node with a minimal DOM stub (see `AGENTS.md`).

## Legal disclaimer

Not investment advice. Static data (snapshot) – past performance does not guarantee future results. Inputs are only stored locally in your browser.