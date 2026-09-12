const FINE_DE = Object.fromEntries(ETFCalc.FINE.map(f => [f, ETFCalc.FINE_LABELS[f]]));
const BKT_DE = Object.fromEntries(ETFCalc.BUCKETS.map(b => [b, ETFCalc.BUCKET_LABELS[b]]));

const I18N = {
  current: "de",
  numLocale: "de-DE",
  strings: {
    de: {
      "app.title": 'ETF-Planer · Planung',
      "btn.lang": 'Sprache: Deutsch/Englisch umschalten',
      "btn.mode": 'Hell/Dunkel umschalten',
      "btn.modeAria": 'Farbmodus umschalten',
      "btn.export": 'Export',
      "btn.exportTitle": 'Bestand und Kauf-Rechner als JSON-Datei speichern',
      "btn.import": 'Import',
      "btn.importTitle": 'Bestand und Kauf-Rechner aus einer JSON-Datei laden',
      "btn.reset": 'Zurücksetzen',
      "btn.resetTitle": 'Alle Eingaben löschen',
      "nav.aria": 'Zu den Sektionen springen',
      "nav.holdings": 'Bestand',
      "nav.buy": 'Sparplan',
      "nav.proj": 'Prognose',
      "hint.aria": 'Hinweis anzeigen',
      "menu.aria": 'Weitere Optionen',
      "sec.holdings": 'Mein Depot',
      "sec.holdingsHint": 'Trage hier ein, was du bereits besitzt — pro ETF eine Zeile mit WKN und Betrag.',
      "sec.buy": 'Monatlicher Sparplan',
      "sec.buyHint": 'Trage hier ein, was du monatlich kaufen willst — pro ETF eine Zeile mit WKN und Betrag.',
      "sec.proj": 'Depot-Entwicklung',
      "sec.projHint": 'Zeigt, wie sich dein Depot entwickeln könnte: Bestand plus Sparplan, mit deinen Rendite-Annahmen.',
      "sub.regions": 'Regionsverteilung',
      "sub.target": 'Empfohlene Zielverteilung',
      "sub.rates": 'Rendite-Annahmen',
      "target.vals": 'Amerika <strong>65 %</strong> · Europa <strong>15 %</strong> · Asien <strong>16 %</strong> · Rest der Welt <strong>4 %</strong>',
      "target.info": 'Das entspricht der globalen Marktkapitalisierung (FTSE All-World / MSCI ACWI) — der einzigen Gewichtung, die sich automatisch selbst korrigiert: Verliert eine Region an Bedeutung, sinkt ihr Gewicht, ohne dass du verkaufen musst. Es gibt keine belastbaren Belege, dass regionale Übergewichte langfristig Rendite bringen; historisch kostete ein Europa-Übergewicht (~15 % vs. Markt) vor allem Rendite, während Asien (~16 %) in einem reinen Industrieländer-Depot systematisch untergewichtet wäre. 4 % Südamerika/Afrika/Ozeanien entsprechen dem Marktanteil. Abweichungen davon sind eine bewusste Wette — die Prognose oben zeigt, wie sich deine Verteilung ohne Verkäufe über die Jahre Richtung Ziel bewegt.',
      "row.wkn": 'WKN',
      "row.amt": 'Betrag',
      "row.add": 'Übernehmen und neue Zeile anlegen',
      "row.del": 'Eintrag löschen',
      "grp.world": 'World',
      "grp.europa": 'Europa',
      "grp.em": 'Emerging Markets',
      "sum.holdings": 'Depotwert',
      "sum.buy": 'Kaufvolumen (monatlich)',
      "kpi.holdings": 'Depotwert',
      "kpi.buy": 'Sparplan / Monat',
      "kpi.proj": 'Prognose {year}',
      "sum.pos.one": 'Position',
      "sum.pos.other": 'Positionen',
      "sum.unk.one": 'Eintrag ohne gültige WKN nicht gezählt',
      "sum.unk.other": 'Einträge ohne gültige WKN nicht gezählt',
      "buy.colRegion": 'Region',
      "buy.colTotal": 'Kauf',
      "buy.empty": 'Noch keine Käufe eingegeben.',
      "proj.colMetric": 'Kennzahl',
      "proj.depot": 'Depotwert',
      "proj.today": '(heute)',
      "proj.empty": 'Kein Bestand erfasst und keine monatlichen Käufe im Kauf-Rechner gesetzt.',
      "proj.emptyRates": 'Noch keine ETFs in Depot oder Sparplan erfasst.',
      "proj.rateTip": 'Rendite seit {year}: {pct} p.a. (real)',
      "imp.failFormat": 'Import fehlgeschlagen: Die Datei enthält kein gültiges ETF-Planer-Format (holdings / purchases).',
      "imp.confirm": 'Import: {h} Bestands- und {p} Kauf-Zeilen laden?',
      "imp.warn.one": 'ACHTUNG: {n} unbekannte WKN wird übernommen, aber nicht gezählt.',
      "imp.warn.other": 'ACHTUNG: {n} unbekannte WKNs werden übernommen, aber nicht gezählt.',
      "imp.badRead": 'Import fehlgeschlagen: Datei konnte nicht gelesen werden.',
      "reset.confirm": 'Alle lokalen Eingaben (Käufe, Bestand, Rendite-Annahmen) löschen?',
      "footer.disclaimer": 'Keine Anlageberatung. Statische Daten — Performance der Vergangenheit schlägt sich nicht immer in der Zukunft nieder. Eingaben werden nur lokal im Browser gespeichert.',
      "data.source": 'Stand: {date} · Alle Renditen in EUR (XETRA)',
      "map.aria": 'Weltkarte der Regionsverteilung',
      "map.not": 'nicht enthalten',
      "rep.phys": 'physisch',
      "rep.synth": 'synthetisch',
      "dist.thes": 'thesaurierend',
      "dist.auss": 'ausschüttend',
      fine: FINE_DE,
      bkt: BKT_DE
    },
    en: {
      "app.title": 'ETF-Planer · Planning',
      "btn.lang": 'Switch language: German/English',
      "btn.mode": 'Toggle light/dark mode',
      "btn.modeAria": 'Toggle color mode',
      "btn.export": 'Export',
      "btn.exportTitle": 'Save portfolio and purchase planner as a JSON file',
      "btn.import": 'Import',
      "btn.importTitle": 'Load portfolio and purchase planner from a JSON file',
      "btn.reset": 'Reset',
      "btn.resetTitle": 'Clear all inputs',
      "nav.aria": 'Jump to sections',
      "nav.holdings": 'Portfolio',
      "nav.buy": 'Savings Plan',
      "nav.proj": 'Projection',
      "hint.aria": 'Show hint',
      "menu.aria": 'More options',
      "sec.holdings": 'My Portfolio',
      "sec.holdingsHint": 'Enter what you already own — one row per ETF with WKN and amount.',
      "sec.buy": 'Monthly Savings Plan',
      "sec.buyHint": 'Enter what you want to buy each month — one row per ETF with WKN and amount.',
      "sec.proj": 'Portfolio Growth',
      "sec.projHint": 'Shows how your portfolio could grow: holdings plus savings plan, based on your return assumptions.',
      "sub.regions": 'Regional Allocation',
      "sub.target": 'Recommended Target Allocation',
      "sub.rates": 'Return assumptions',
      "target.vals": 'Americas <strong>65%</strong> · Europe <strong>15%</strong> · Asia <strong>16%</strong> · Rest of World <strong>4%</strong>',
      "target.info": 'This matches the global market capitalization (FTSE All-World / MSCI ACWI) — the only weighting that corrects itself automatically: if a region loses significance, its weight falls without you having to sell. There is no solid evidence that regional overweighting pays off in the long run; historically, a European overweight (~15% vs. market) mainly cost return, while Asia (~16%) would be systematically underweighted in a pure developed-markets portfolio. The 4% for South America/Africa/Oceania matches their market share. Deviating from this is a deliberate bet — the projection above shows how your allocation moves toward the target over the years without any sales.',
      "row.wkn": 'WKN',
      "row.amt": 'Amount',
      "row.add": 'Confirm and add a new row',
      "row.del": 'Delete entry',
      "grp.world": 'World',
      "grp.europa": 'Europe',
      "grp.em": 'Emerging Markets',
      "sum.holdings": 'Portfolio Value',
      "sum.buy": 'Purchase Volume (monthly)',
      "kpi.holdings": 'Portfolio Value',
      "kpi.buy": 'Savings / month',
      "kpi.proj": 'Projection {year}',
      "sum.pos.one": 'Position',
      "sum.pos.other": 'Positions',
      "sum.unk.one": 'entry without a valid WKN not counted',
      "sum.unk.other": 'entries without a valid WKN not counted',
      "buy.colRegion": 'Region',
      "buy.colTotal": 'Buy',
      "buy.empty": 'No purchases entered yet.',
      "proj.colMetric": 'Metric',
      "proj.depot": 'Portfolio Value',
      "proj.today": '(today)',
      "proj.empty": 'No holdings recorded and no monthly purchases set in the purchase planner.',
      "proj.emptyRates": 'No ETFs recorded in portfolio or savings plan yet.',
      "proj.rateTip": 'Return since {year}: {pct} p.a. (real)',
      "imp.failFormat": 'Import failed: The file does not contain a valid ETF-Planer format (holdings / purchases).',
      "imp.confirm": 'Import: Load {h} holding and {p} purchase rows?',
      "imp.warn.one": 'CAUTION: {n} unknown WKN will be imported but not counted.',
      "imp.warn.other": 'CAUTION: {n} unknown WKNs will be imported but not counted.',
      "imp.badRead": 'Import failed: File could not be read.',
      "reset.confirm": 'Delete all local inputs (purchases, portfolio, rate assumptions)?',
      "footer.disclaimer": 'Not investment advice. Static data — past performance does not always reflect future results. Inputs are stored only locally in your browser.',
      "data.source": 'As of {date} · All returns in EUR (XETRA)',
      "map.aria": 'World map of the regional allocation',
      "map.not": 'not included',
      "rep.phys": 'physical',
      "rep.synth": 'synthetic',
      "dist.thes": 'accumulating',
      "dist.auss": 'distributing',
      fine: { nordamerika: 'North America', europa: 'Europe', asien: 'Asia', suedamerika: 'South America', afrika: 'Africa', australien: 'Australia/Oceania' },
      bkt: { amerika: 'Americas', europa: 'Europe', em: 'Emerging Markets', rest: 'Rest of World' },
      etf: { emu: { short: 'MSCI Europe' }, eusri: { short: 'MSCI Europe SRI' } }
    }
  }
};

function t(key, vars) {
  const table = I18N.strings[I18N.current] || I18N.strings.de;
  let s = table[key];
  if (s == null || typeof s !== "string") s = key.split(".").reduce((o, k) => (o == null ? o : o[k]), table);
  if (s == null || typeof s !== "string") s = key.split(".").reduce((o, k) => (o == null ? o : o[k]), I18N.strings.de);
  if (s == null || typeof s !== "string") s = key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split("{" + k + "}").join(String(v));
  return s;
}

function tpl(key, n) { return t(key + (n === 1 ? ".one" : ".other"), { n }); }

function setLang(l) { I18N.current = l === "en" ? "en" : "de"; I18N.numLocale = I18N.current === "en" ? "en-GB" : "de-DE"; }

function etfShort(e) {
  const key = "etf." + e.id + ".short";
  const s = t(key);
  return s === key ? e.shortName : s;
}

function applyLang() {
  if (typeof document === "undefined") return;
  try { document.title = t("app.title"); } catch (e) {}
  const de = document.documentElement;
  if (de && de.setAttribute) de.setAttribute("lang", I18N.current);
  if (!document.querySelectorAll) return;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder"))); });
  document.querySelectorAll("#btn-lang .lang-seg").forEach(b => b.classList.toggle("active", b.getAttribute("data-lang") === I18N.current));
}