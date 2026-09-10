# AGENTS.md — ETF-Planer

Kontext & Konventionen für KI-Agenten, die an diesem Projekt arbeiten.

## Zweck

Persönlicher, statischer ETF-Planer (eine Seite) zum Vergleichen, Kombinieren und Planen von 3 ausgewählten ETFs. Anlage-Horizont: langfristig (15+ Jahre), Nachhaltigkeit ist wichtig (Paris-Aligned/CTB bevorzugt), Ausführung immer XETRA/EUR.

## Projektregeln

- **Kein Build-Step, keine Dependencies, keine Frameworks.** Vanilla HTML/CSS/JS; die Seite wird per Doppelklick auf `planen.html` (`file://`) geöffnet.
- Deshalb: **kein `fetch()`** — Daten via `<script src="data.js">` auf globalem Objekt.
- UI-Sprache: **Deutsch**, Zahlenformat `de-DE` (`Intl.NumberFormat`). Keine Emojis im Code.
- Keine Kommentare im Code, außer zwingend nötig.
- Änderungen danach immer mit den Node-Smoke-Tests prüfen (siehe unten), da kein Browser in der dev-VM verfügbar ist.

## Dateien

| Datei | Inhalt |
|---|---|
| `data.js` | `ETF_DATA`: statischer Snapshot von Finanzfluss/justETF, Stand **2026-09-03**, XETRA-EUR-Renditen. **Single Source of Truth** für alle ETF-Stammdaten inkl. `color` (Donut-Farbe) und `defaultRate` (Rendite-Annahme) je ETF — `ETF_COLORS`/`DEFAULT_RATES` werden daraus abgeleitet. Manuell aktuell halten (Performance/Jahr rollen: 1J/3J/5J neu setzen, `null` wo Fonds zu jung). |
| `calc.js` | Reine Rechenlogik (DOM-frei, `module.exports` für Node-Tests): `aggregate()`, `solve()`, `project()`, `macroOf()`, `parseEuro()`, `parseHoldings()`. `parseTargets()` und `parseHoldings()` sind ungenutzt (Altlasten nach Umstieg auf Zeilen-Editor). |
| `shared.js` | Gemeinsame Globals der Seite: `ETFS`, `BUCKET_COLORS`, `BAR_COLORS`, `ETF_COLORS` (aus dem `color`-Feld je ETF in data.js abgeleitet), `nfEur`, `fmtPct`, `fmtPerf`, `esc`. Außerdem die Weltkarten-Engine (`WORLD_GRID`, `GRID_CHAR`, `intensityFill()`, `worldMapSVG(regions, cls)` — nimmt ein Regionen-Objekt statt eines ETF an, damit Prognose-Spalten eine Karte bekommen können; `cls` optional, Default `worldmap`, Box-Groesse kommt per CSS ueber den Container). Skript-Reihenfolge: data -> calc -> shared -> planen.js. |
| `planen.html` + `planen.js` | Einzige Seite "Planer" (interaktiv, localStorage): 1 Bestand (Zeilen-Editor: WKN/ISIN + Betrag, "+" fuegt Zeile an, Muell-Icon loescht; rechts neben Plus- und Muell-Icon steht der offizielle ETF-Name als .hold-name-Span (full `e.name`, nicht shortName; bei unbekannter/leerer Eingabe leer, `flex:1` mit Ellipsis + title-Volltext; beim Tippen aktualisiert ihn der q-Handler per `el.querySelector` live, ohne Re-Render/Fokusverlust; unbekannt -> kein Name); doppelte WKN werden beim "+"-Klick in die bestehende Zeile gemerged (Betrag addiert, Uberzahl-Zeile entfällt; nur pro Editor, also Bestand und Kauf getrennt); unbekannte/leere Zeilen loesen keinen Merge aus; Fuessler zeigt `updateHoldingsSum()` live den **Depotwert**, nur gueltige WKN, mit Hinweis auf nicht gezaehlte Eintraege; darunter zeigt `updateHoldingsFine()` einen gestapelten Regions-Balken mit Legende (`regionBarHTML(agg)`, 6 feine Regionen, 0 %-Regionen ausgeblendet)), 2 Kauf-Rechner (gleicher Zeilen-Editor wie Bestand; ersetzt den frucheren Torten-Donut durch denselben Regions-Balken), 3 Prognose (statischer Hinweis „Empfohlene Zielverteilung 65/15/16/4" im .target-info-Block erklaert die Marktgewichtung; Ziel-Eingabe + Ziel-Vergleichstabelle wurden auf Owner-Wunsch entfernt). Prognose-Tabelle ist TRANSponiert: Spalten = heute/+1/+2/+3/+5/+7/+10 Jahr (Labels dynamisch als Kalenderjahre via `new Date().getFullYear()`), Zeilen = Depotwert (Werte fett; Einzahlungen/Ertrag-Zeilen auf Owner-Wunsch entfernt) + 6 Regionen (ohne Delta-Spans, Farb-Punkt via .dot-region). Prognose-Karten-Overlay: schwebendes #proj-map-overlay (position:absolute in .proj-table-box) zeigt genau EINE Mini-Weltkarte (`worldMapSVG(p.fine)`) der gerade ueberfahrenen Jahr-Spalte; Delegation mouseover/mousemove/mouseleave/click auf #proj-table, Zellen tragen data-col 1-5; Klick heftet Spalte fest (pinnedCol), zweiter Klick darauf loest und verbirgt (overlayCol, nicht in localStorage). Rendite-Eingaben als umbrechende .rate-chip-Zeile (Farbpunkt + Kurzname + kompaktes %-Feld; der "Rendite seit <Jahr>: x % p.a. (real)"-Hinweis liegt als CSS-Tooltip (data-tip + .rate-chip::after, greift auch ueber dem Eingabefeld) am Chip), kein .buy-grid/.buy-item mehr. Rate-Input loest nur save()+updateProjection() (#proj-table/Overlay) und ruehrt NIEMALS am DOM der Zeilen-Editoren; render() laeuft einzig bei add/del/Merge/Import und setzt .hold-name in rowHTML neu - ".hold-name fehlt nach Rate-Wechsel" ist mit diesem Stand nicht reproduzierbar (eher veraltete Datei-Kopie im Browser pruefen). localStorage (Key `etfplaner.v1`), State: purchases + holdings (beide Arrays `[{q,v}]`, unbekannte WKN werden ignoriert, Duplikate pro ETF summiert), rates, ui ({mode: null|light|dark}; null = folgt prefers-color-scheme; nicht exportiert). Design: Hell/Dunkel per #btn-mode (data-mode am <html>, #ico-sun/#ico-moon); ein friheres zweites Skin "Editorial" (#skin-switch) wurde auf Owner-Wunsch wieder entfernt; alle Farben/Radien/Schatten als CSS-Variablen in style.css, System-Font-Stack, keine externen Assets. Kauf-Rechner: gestapelter Regions-Balken (`regionBarHTML(agg)`, identisch zu "Mein Depot") plus Tabelle mit denselben 6 feinen Regionen, anteilig nach Kaufwert (ein Zahlensystem; Balken-Segmente auf 100 % renormalisiert, Legende zeigt die Roh-Prozente — Regionen-Summen sind naemlich < 100 %, Geldmarkt/Liquiditaet in den Fonds), Regionentabelle nur ETFs >0 (Duplikate als eine Spalte), Summenzeile `#buy-sum` ("Kaufvolumen (monatlich)") analog `#holdings-sum`; TER-Zeile entfernt.Makro-Buckets (`macroOf()`) werden nur noch im Ziel-Vergleich der Prognose verwendet. Export/Import im Header (#btn-export/#btn-import + versteckter #import-file, nur Bestand + Kauf, nicht Renditen): JSON {app:"etfplaner",version:1,exportedAt,holdings,purchases}; Export via Blob+<a download>, Import via FileReader mit confirm-Rueckfrage (Hinweis bei unbekannten WKN), ersetzt die Zeilen in-place und re-rendert Editoren (createRowEditor gibt {render} zurueck). Reset-Button hier. Events via Delegation auf `#holdings-rows`. |
| `style.css` | CSS-Variablen in `:root`; globale Seitenstyles (Header, Cards, Tabellen, Weltkarte, Overlay). |

## Die ETFs in ETF_DATA & Portfolio-Kontext

| Rolle | ETF | ISIN / WKN | TER |
|---|---|---|---|
| Kern (Welt DM) | Amundi MSCI World ESG Broad Transition Acc | IE0001GSQ2O9 / ETF142 | 0,20 % |
| Tilt (Euroraum) | Amundi MSCI EMU ESG Broad Transition Acc | LU0908501058 / LYX0Q1 | 0,12 % |
| EM-Satellit | iShares MSCI EM ESG Enhanced Acc | IE00BHZPJ239 / A2PCB0 | 0,18 % |
| Zusatz-Bestand (nicht Neukauf-Plan) | iShares MSCI World SRI Acc | IE00BYX2JD69 / A2DVB9 | 0,20 % |
| Zusatz-Bestand (Europa-Tilt, inkl. CH/UK) | iShares MSCI Europe SRI Acc | IE00B52VJ196 / A1H7ZS | 0,20 % |

- **Beispiel-Ziel-Allokation: 70 % World / 20 % EMU / 10 % EM** (ETF-Quoten, entsprechen ~54 % Amerika / 30 % Europa / 10 % EM / 7 % Rest in Regionen).
- Bestand gilt als **nicht verkäuflich** — alle Modelle gehen von „nur kaufen, nicht verkaufen" aus (`w ≥ 0`, Bestand als Untergrenze). Benchmark-Beispiele unten nutzen einen Beispiel-Bestand von 60k World / 20k EMU.
- Neue ETFs: vom Owner genannte WKN/ISIN von Finanzfluss/justETF recherchieren und **vollständig** nach `ETF_DATA.etfs` eintragen (Regionen-Summe ~100, `afrika: 0` wenn nicht gelistet) — dann erkennen Karten, Kauf-Rechner, Parser und Prognose ihn automatisch. Pro ETF zusätzlich `color` (Donut/ETF-Farbe) und `defaultRate` (Rendite-Annahme, aus denen `ETF_COLORS`/`DEFAULT_RATES` automatisch abgeleitet werden) in data.js pflegen — keine separaten Einträge mehr in shared.js/planen.js nötig.
- Alte localStorage-Formate: `holdings` als Map `{id:wert}` wird beim Laden per `normalizeHoldings()` in Zeilen `[{q,v}]` konvertiert (id→WKN).
- Auswahlkriterien (Referenz-Rahmen, bei neuen ETF-Kandidaten prüfen): TER ≤ 0,25 %, Fondsvolumen > 1 Mrd. €, EUR-handelbar (XETRA), nachhaltig, langfristig thesaurierend bevorzugt. Fondswährung USD vs. EUR ist egal (keine FX-Konvertierung beim XETRA-Kauf).

## UI-Sektionen (Reihenfolge fix, vom Owner so gewuenscht)
Einzige Seite: **planen.html** = „Planer" (1 Bestand · 2 Kauf-Rechner · 3 Prognose). Entfernt auf Owner-Wunsch: die frühere zweite Seite „ETFs & Karten" (`index.html` + `map.js`, statische Vergleichsseite mit Zeilen-Weltkarten) — die Karten-Engine lebt in `shared.js` weiter und wird nur noch vom Prognose-Overlay genutzt. Ebenso entfernt: „Gesamtportfolio"-Sektion und die frühere Sektion „Ziel-Solver" (UI) — `ETFCalc.solve()` bleibt als getestete Library in calc.js erhalten (Benchmarks unten), kann aber jederzeit re-aktiviert werden.

## Domänen-Logik (wichtig für Änderungen)

### Regionsmodell
- **Anzeigename (`shortName`) laut Owner-Wunsch:** "MSCI World", "MSCI Europa", "MSCI Emerging Markets" — offizielle Fondsnamen bleiben in `name`.
- **Feine Regionen** (`regions` pro ETF): Nordamerika, Europa, Asien, Südamerika, Afrika, Australien/Ozeanien — so wie Finanzfluss sie ausweist.
- **Makro-Buckets** (`amerika, europa, em, rest`) via `macroOf()`: DM-Fonds → amerika=Nordamerika, europa=Europa, rest=Rest; **EM-Fonds werden komplett als `em` gezählt** (marketType-Flag), ungeachtet ihrer geografischen Asien/LatAm-Split. Das ist gewollt (bildet die Session-Rechnungen ab).
- **UI-Regel aus Owner-Feedback:** Überall nur die feinen Regionen zeigen — die Makro-Doppeldarstellung wurde ausdrücklich entfernt. Makro-Buckets bleiben dort, wo Kauf-Rechner und Ziel-Vergleich der Prognose (Sektion 4) sie brauchen. Regionen mit 0 % werden ausgeblendet (Schwellwert > 0.04, in `worldMapSVG()` und Legenden identisch halten).
- **Regionsverteilung = Pixel-Weltkarte aus echten Geodaten** (`WORLD_GRID` + `worldMapSVG()` in `shared.js`, wird nur noch vom Prognose-Overlay genutzt): 100×36-Zeichen-Raster (1.087 Land-Pixel, Zelle 4×6 px, rx=1, innerer Rand via viewBox-Versatz PAD=8/PADV=10). Erzeugt mit `tools/gen-world-grid.js` + `tools/countries.geo.json` (Punkt-in-Polygon-Rasterung echter Ländergrenzen, äquirektangular, Zuschnitt 84°N–56°S) — bei Änderungen dort neu generieren und `WORLD_GRID` ersetzen. Nachbearbeitung im Tool: Kunstvolle Schnitte für Isthmus Panama (N↔S), Gibraltar (E↔F), Sues (A↔F, aktuell 0 nötig). Zeichen N/S/E/F/A/O → feine Regionen, Wasser = `.`. Einzelne Intensitaetsfarbe (Heatmap): Helligkeit propto Regionsgewicht ueber `intensityFill()` (linear `t = pct/100`, `MAP_LIGHT` → `MAP_DARK`, Floor 0.03 — auf Wunsch des Owners: lineare Skala statt log, damit kleine Anteile blass bleiben), nicht enthaltene Regionen grau (`#dfe3e8`), `<title>`-Tooltips. Regionen mit 0 % werden nicht eingefärbt (Schwellwert > 0.04). Owner-Feedback: zu viele Farben machen die Verteilung schwer lesbar — deshalb eine einzige Intensitätsfarbe. Grauezellen-Kreuzcheck (muss stimmen): World = Afrika(181), EMU = S+F+O(348), EM = O(55).

### Solver (`calc.js solve()`, UI entfernt — nur noch Library)
- Semantik: **Einmalkauf**. „Neugeld"-Modus: `min ‖M·w − t·B‖²` s. d. `w ≥ 0`, `Σw = B`. „Gesamtportfolio"-Modus: Ziel gilt für Bestand + Kauf (bestehende Positionen sind nicht verkäuflich).
- Exakte Lösung über **Active-Set-Enumeration** (max. 2ⁿ Teilmengen, n = ETF-Anzahl; bei n=3 trivial). Bei ≤ ~6 ETFs kein Problem, bei vielen ETFs auf O(2ⁿ) hinweisen.
- Unerreichbare Ziele sind normal (z. B. 55/35/10 ist mit diesen 3 Fonds exakt nicht lösbar) → UI zeigt nächstbeste Lösung + Restabweichung in pp, Warnbox ab > 1 pp.
- Lineare Algebra: Gauss-Jordan in `solveLinearSystem()` — dort gab es bereits einen `M[i][i]`-Tippfehler-Bug; Mathe-Änderungen immer mit den Benchmarks unten testen.

### Parser
- `parseEuro()`: deutsche Zahlformate (`98.000`, `1.350,50`, `42 000 €`).
- `parseHoldings()`: Zeilen `WKN_oder_ISIN, Betrag`; Trennzeichen Komma/Semikolon/Tab; unbekannte Zeilen werden als Warnung zurückgegeben.

### Prognose (`calc.js project()` + Sektion 3 in planen.js)
- Wachstumsmodell: monatliche Verzinsung (`rm = rate/100/12`), Rentenfaktor: `value_n = h·(1+rm)^(12n) + p·((1+rm)^(12n)-1)/rm`; Edge case rm=0 linear.
- Regionsanteil pro Jahr via `aggregate()` über die prognostizierten Teilwerte — zeigt Drift (z. B. Europa sinkt, Asien steigt).
- Rendite-Annahmen editierbar, Default `DEFAULT_RATES` (world 8 / emu 7 / em 8.5) — NICHT die sinceInception-Werte als Default (durch kurze Bullenmärkte verzerrend); reale Werte werden nur als Hinweis angezeigt.
- `updateProjection()` wird direkt von allen ÄNDERUNGS-Handlern aufgerufen (Kauf-Inputs, Bestand-Import/-Edit/-Delete, Ziel-Eingabe) — eine separate „Gesamtansicht"-Sektion gibt es nicht mehr (auf Owner-Wunsch entfernt).

## Bekannte Grenzen / offene Wünsche

- Daten sind Snapshot — keine automatische Aktualisierung.
- Solver bleibt Einmalkauf-Modell; die Monats-Sparplan-Dynamik zeigt Sektion 4 „Prognose" (`project()`); ein Beispiel-Aufholszenario (EM untergewichtet) ist in den Benchmarks unten codiert.
- Optional angedacht: weitere ETFs (Datenmodell ist generisch).

## Testen

Schneller Logik-Test (Calc-Kern):

Im Projektverzeichnis ausführen:

```bash
node -e "
const fs=require('fs'); const C=require('./calc.js');
const D=new Function(fs.readFileSync('./data.js','utf8')+';return ETF_DATA;')();
const E=D.etfs.filter(e=>['world','emu','em'].includes(e.id));
const r=C.solve(E,{amerika:53.97,europa:29.76,em:10,rest:6.27},30000,[60000,20000,0]);
console.log(r.w.map(v=>Math.round(v)));"
```

**Benchmarks (sollten stabil bleiben):**
1. Catch-up `[60000,20000,0]` + 30.000 € auf obiges Ziel → ≈ `[16935, 2227, 10838]`, Restabweichung ≤ ~0,5 pp.
2. Ziel aus bekanntem Mix `[500,300,200]` aggregiert, Neugeld-Solver → exakt `[500,300,200]`.
3. Unerreichbar `55/35/10/0` (solve, Library) → feasible Lösung, `Σw = Budget`, `w >= 0`.
4. `project(etfs,[60000,20000,0],[400,100,200],[8,7,8.5],[0,1,3,5,10])` → Jahr 1 total 95.141 €, Jahr 10 301.486 € (per Python-Rentengleichung verifiziert); Europa-Drift Jahr 10 ≈ −6,6 pp.

UI-Rendern: planen.js mit minimalem DOM-Stub in Node ausführen (`document`/`localStorage` gestubbt; planen.js ohne weitere querySelectorAll-Anforderungen) — Testdatei: /tmp/opencode/test-planer-page.js (31 Checks) faehrt beide Zeilen-Editoren per Event-Delegation, prueft: init, "+"-Zeilen, Duplikat-Merge per "+" (Bestand + Kauf), Duplikat-Summen (Kauf + Prognose paidIn), Unbekannt-Hinweis, Muelleimer, Regions-Balken (Bestand + Kauf), Tabelle=gekaufte ETFs, voller ETF-Name je Zeile (Kauf + Bestand, unbekannt -> leer), Prognose-Karten-Overlay (genau eine Karte je Hover-Spalte, Pin per Klick, zweiter Klick loest), Export/Import-Roundtrip (Blob/FileReader/alert gestubbt; ungueltige Datei -> Alert), Persistenz; Vorsicht: Regex-Checks auf Umlaute im App-String schlagen wegen Unicode-Zerlegung fehl — lieber feste Anker wie "sum-hint" pruefen; `display:block` fuer `.bucket-row .track/.fill` nicht vergessen — bekannter Bug; Basis-Feldstyle gilt nur fuer `input[type=number], input:not([type]), textarea` — neue Text-Inputs sonst Browser-Default-Optik; einheitliche Zeilenhoehe im Bestand ueber `.hold-row > input/button { height:38px }`.)
