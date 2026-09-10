# ETF-Planer

Persönlicher, statischer ETF-Planer (eine Seite) zum Vergleichen, Kombinieren und Planen von ausgewählten ETFs. Langfristiger Anlage-Horizont (15+ Jahre), Nachhaltigkeit ist wichtig (Paris-Aligned / CTB bevorzugt), Ausführung immer in EUR auf XETRA.

## Features

- **Mein Depot** – Zeilen-Editor für Bestand (WKN/ISIN + Betrag), live Depotwert und gestapelter Regions-Balken (Nordamerika, Europa, Asien, Südamerika, Afrika, Australien/Ozeanien).
- **Monatlicher Sparplan** – gleicher Zeilen-Editor für monatliche Käufe, Regionsverteilung als Balken und Tabelle.
- **Depot-Entwicklung** – transponierte Prognose-Tabelle (heute bis +10 Jahre) über monatlichen Zinseszins, inkl. Regions-Drift. Rendite-Annahmen pro ETF editierbar (Standard 8/7/8,5 %).
- **Empfohlene Zielverteilung** – 65 % Amerika / 15 % Europa / 16 % Asien / 4 % Rest (globale Marktkapitalisierung, FTSE All-World / MSCI ACWI).
- **Hell/Dunkel-Modus**, **Export/Import** als JSON-Datei, lokale Persistenz über `localStorage` (`etfplaner.v1`).

## Schnellstart

Kein Build-Step, keine Dependencies, keine Frameworks – reines Vanilla HTML/CSS/JS.

1. `index.html` per Doppelklick öffnen (`file://`).
2. WKN oder ISIN + Betrag eintragen. Doppelte WKN werden beim „+" automatisch in die bestehende Zeile addiert.
3. Daten werden nur lokal im Browser gespeichert – nichts verlässt deinen Rechner.

## Die ETFs

Stammdaten liegen als statischer Snapshot in `data.js` (Stand 2026-09-08, Renditen EUR/XETRA) und sind die **Single Source of Truth** – Farben, Standard-Renditen, Karten und Prognose werden daraus abgeleitet.

| Rolle | ETF | ISIN / WKN | TER |
|---|---|---|---|
| Kern (Welt DM) | Amundi MSCI World ESG Broad Transition Acc | IE0001GSQ2O9 / ETF142 | 0,20 % |
| Tilt (Euroraum) | Amundi MSCI EMU ESG Broad Transition Acc | LU0908501058 / LYX0Q1 | 0,12 % |
| EM-Satellit | iShares MSCI EM ESG Enhanced Acc | IE00BHZPJ239 / A2PCB0 | 0,18 % |
| Zusatz-Bestand | iShares MSCI World SRI Acc | IE00BYX2JD69 / A2DVB9 | 0,20 % |
| Zusatz-Bestand (Europa) | iShares MSCI Europe SRI Acc | IE00B52VJ196 / A1H7ZS | 0,20 % |

Beispiel-Ziel-Allokation: **70 % World / 20 % EMU / 10 % EM** (≈ 54 % Amerika / 30 % Europa / 10 % EM / 7 % Rest in Regionen). Bestand gilt als nicht verkäuflich – alle Modelle gehen von „nur kaufen, nicht verkaufen" aus.

## Projektstruktur

| Datei | Inhalt |
|---|---|
| `index.html` | Einzige Seite „Planer" (Bestand · Sparplan · Prognose) |
| `data.js` | `ETF_DATA` – statischer Snapshot von Finanzfluss/justETF (Single Source of Truth) |
| `calc.js` | Reine Rechenlogik (DOM-frei): `aggregate()`, `solve()`, `project()`, `macroOf()`, `parseEuro()`, `parseHoldings()` |
| `shared.js` | Gemeinsame Globals (`ETFS`, Farben, Formatierung, Weltkarten-Engine) |
| `planen.js` | Interaktive UI-Logik (Zeilen-Editoren, Prognose, Export/Import) |
| `style.css` | CSS-Variablen + globale Styles (Hell/Dunkel über `data-mode`) |
| `tools/` | `update-etf-data.py` (Daten-Update von Finanzfluss), `gen-world-grid.js` + `countries.geo.json` (Weltkarten-Raster) |

Skript-Reihenfolge: `data.js → calc.js → shared.js → planen.js`.

### Regionsmodell

- **Feine Regionen**: Nordamerika, Europa, Asien, Südamerika, Afrika, Australien/Ozeanien (wie Finanzfluss).
- **Makro-Buckets** (`macroOf()`): DM-Fonds → Amerika/Europa/Rest; EM-Fonds zählen komplett als `em`.
- Regionsverteilung in Balken und Prognose = die feinen Regionen; 0-%-Regionen werden ausgeblendet.

## Daten aktualisieren

```bash
python3 tools/update-etf-data.py IE0001GSQ2O9 LU0908501058 IE00BHZPJ239
```

Das Skript lädt die aktuellen Kennzahlen von Finanzfluss (`_payload.json`) und schreibt `data.js` neu. Neue ETFs werden automatisch erkannt – bitte danach die manuellen Felder (`id`, `color`, `defaultRate`, `marketType`, `shortName`) prüfen.

## Testen

Rechenlogik (kein Browser nötig):

```bash
node -e "
const fs=require('fs'); const C=require('./calc.js');
const D=new Function(fs.readFileSync('./data.js','utf8')+';return ETF_DATA;')();
const E=D.etfs.filter(e=>['world','emu','em'].includes(e.id));
const r=C.solve(E,{amerika:53.97,europa:29.76,em:10,rest:6.27},30000,[60000,20000,0]);
console.log(r.w.map(v=>Math.round(v)));"
# Erwartung ≈ [16935, 2227, 10838]
```

UI-Logik: `planen.js` lässt sich mit einem minimalen DOM-Stub in Node ausführen (siehe `AGENTS.md`).

## Rechtlicher Hinweis

Keine Anlageberatung. Statische Daten (Snapshot) – die Performance der Vergangenheit schlägt sich nicht immer in der Zukunft nieder. Eingaben werden nur lokal im Browser gespeichert.