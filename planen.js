(() => {
  const LS_KEY = "etfplaner.v1";
  const DEFAULT_RATES = Object.fromEntries(ETFS.map(e => [e.id, e.defaultRate]));

  const state = load() || {
    purchases: [],
    holdings: [],
    rates: Object.assign({}, DEFAULT_RATES),
    ui: { mode: null }
  };
  if (!state.ui) state.ui = { mode: null };

  function normalizeRows(r) {
    if (Array.isArray(r)) return r.filter(x => x && typeof x === "object").map(x => ({ q: String(x.q || ""), v: Math.max(0, Number(x.v) || 0) }));
    const out = [];
    if (r && typeof r === "object") for (const [k, v] of Object.entries(r)) {
      const e = ETFS.find(x => x.id === k);
      if (e && Number(v) > 0) out.push({ q: e.wkn, v: Number(v) });
    }
    return out;
  }
  function toRowArray(rows) {
    return rows.filter(r => r && String(r.q || "").trim()).map(r => ({ q: String(r.q), v: Number(r.v) || 0 }));
  }
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return {
        purchases: normalizeRows(s.purchases),
        holdings: normalizeRows(s.holdings),
        rates: Object.assign({}, DEFAULT_RATES, s.rates),
        ui: s.ui && typeof s.ui === "object" && (s.ui.mode === "dark" || s.ui.mode === "light") ? { mode: s.ui.mode } : null
      };
    } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

  function resolveEtf(q) {
    const s = String(q || "").trim().toUpperCase();
    if (!s) return null;
    return ETFS.find(e => e.wkn.toUpperCase() === s || e.isin.toUpperCase() === s) || null;
  }
  function sumById(rows) {
    const out = {};
    for (const r of rows) {
      const e = resolveEtf(r.q);
      if (e) out[e.id] = (out[e.id] || 0) + (Number(r.v) || 0);
    }
    return out;
  }
  function unknownRows(rows) {
    return rows.filter(r => String(r.q || "").trim() && !resolveEtf(r.q)).length;
  }

  function regionBarHTML(agg) {
    const entries = ETFCalc.FINE
      .map(f => ({ label: ETFCalc.FINE_LABELS[f], value: agg.fine[f] || 0, color: BAR_COLORS[f] }))
      .filter(x => x.value > 0.04);
    const sum = entries.reduce((s, x) => s + x.value, 0) || 1;
    const bar = entries.map(x => `<div class="region-seg" style="width:${(x.value / sum * 100).toFixed(3)}%;background:${x.color}" title="${esc(x.label)}: ${fmtPct1(x.value)}"></div>`).join("");
    const legend = entries.map(x => `<div class="legend-item"><span class="dot" style="background:${x.color}"></span>${esc(x.label)} · ${fmtPct1(x.value)}</div>`).join("");
    return `<div class="region-bar">${bar}</div><div class="legend region-legend">${legend}</div>`;
  }

  // --- generischer Zeilen-Editor (Bestand + Kauf-Rechner) ---
  const ICON_PLUS = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  const ICON_TRASH = `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M6.5 2h3M4 4l.8 10h6.4L12 4M6.5 7v4M9.5 7v4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;

  function rowHTML(r, i, isLast) {
    const known = !String(r.q || "").trim() || !!resolveEtf(r.q);
    const e = resolveEtf(r.q);
    return `<div class="hold-row">
      <input class="hold-q${known ? "" : " input-err"}" data-idx="${i}" data-field="q" value="${esc(r.q)}" placeholder="WKN oder ISIN" autocomplete="off">
      <input class="hold-v" type="number" data-idx="${i}" data-field="v" min="0" step="100" value="${r.v}" placeholder="Betrag">
      <span class="hold-currency">€</span>
      ${isLast
        ? `<button class="icon-btn" data-act="add" data-idx="${i}" title="Übernehmen und neue Zeile anlegen">${ICON_PLUS}</button>`
        : `<button class="icon-btn icon-del" data-act="del" data-idx="${i}" title="Eintrag löschen">${ICON_TRASH}</button>`}
      <span class="hold-name" data-idx="${i}" title="${e ? esc(e.name) : ""}">${e ? esc(e.name) : ""}</span>
    </div>`;
  }

  function createRowEditor(containerId, rows, onLive) {
    const el = document.getElementById(containerId);
    function render() {
      if (!rows.length) rows.push({ q: "", v: "" });
      el.innerHTML = rows.map((r, i) => rowHTML(r, i, i === rows.length - 1)).join("");
    }
    el.addEventListener("input", ev => {
      const d = ev.target.dataset;
      const row = rows[+d.idx];
      if (!row) return;
      if (d.field === "q") {
        row.q = ev.target.value;
        const e = resolveEtf(row.q);
        const known = !String(row.q).trim() || !!e;
        if (ev.target.classList) ev.target.classList.toggle("input-err", !known);
        const nameEl = el.querySelector ? el.querySelector('.hold-name[data-idx="' + d.idx + '"]') : null;
        if (nameEl) {
          nameEl.textContent = e ? e.name : "";
          if (e) nameEl.setAttribute("title", e.name); else nameEl.removeAttribute("title");
        }
      } else if (d.field === "v") {
        row.v = Math.max(0, parseFloat(ev.target.value) || 0);
      } else return;
      save(); onLive();
    });
    el.addEventListener("click", ev => {
      const btn = ev.target.closest ? ev.target.closest("[data-act]") : null;
      if (!btn || !btn.dataset.act) return;
      const idx = +btn.dataset.idx;
      if (btn.dataset.act === "add") {
        const e = resolveEtf(rows[idx] && rows[idx].q);
        if (e) {
          const dupIdx = rows.findIndex((r, j) => j !== idx && resolveEtf(r.q) && resolveEtf(r.q).id === e.id);
          if (dupIdx !== -1) {
            rows[dupIdx].v = (Number(rows[dupIdx].v) || 0) + (Number(rows[idx].v) || 0);
            rows.splice(idx, 1);
            const last = rows[rows.length - 1];
            if (!last || String(last.q).trim()) rows.push({ q: "", v: "" });
            save(); render(); onLive();
            return;
          }
        }
        rows.splice(idx + 1, 0, { q: "", v: "" });
        save(); render();
        const inputs = el.querySelectorAll(".hold-q");
        if (inputs[idx + 1]) inputs[idx + 1].focus();
      } else if (btn.dataset.act === "del") {
        rows.splice(idx, 1);
        save(); render(); onLive();
      }
    });
    render();
    return { render };
  }

  function sumLine(elId, label, byId, rows) {
    const total = Object.values(byId).reduce((s, v) => s + v, 0);
    const positions = Object.values(byId).filter(v => v > 0).length;
    const unknown = unknownRows(rows);
    document.getElementById(elId).innerHTML = `<span class="sum-label">${label} · ${positions} ${positions === 1 ? "Position" : "Positionen"}</span><span class="sum-value">${nfEur.format(total)}</span>`
      + (unknown ? `<span class="muted sum-hint">(${unknown} ${unknown === 1 ? "Eintrag" : "Einträge"} ohne gültige WKN nicht gezählt)</span>` : "");
  }

  // --- Bestand ---
  function updateHoldingsFine() {
    const el = document.getElementById("holdings-fine");
    if (!el) return;
    const byId = sumById(state.holdings);
    const items = ETFS.map(e => ({ etf: e, value: byId[e.id] || 0 })).filter(i => i.value > 0);
    if (!items.length) { el.innerHTML = ""; return; }
    el.innerHTML = regionBarHTML(ETFCalc.aggregate(items));
  }
  function updateHoldingsSum() {
    sumLine("holdings-sum", "Depotwert", sumById(state.holdings), state.holdings);
    updateHoldingsFine();
  }
  function holdingsLive() { updateHoldingsSum(); renderProjRates(); updateProjection(); }

  // --- Kauf-Rechner ---
  function updateBuy() {
    const byId = sumById(state.purchases);
    const items = ETFS.map(e => ({ etf: e, value: byId[e.id] || 0 })).filter(i => i.value > 0);
    const agg = ETFCalc.aggregate(items);
    document.getElementById("buy-fine-bar").innerHTML = items.length ? regionBarHTML(agg) : "";
    document.getElementById("buy-fine").innerHTML = items.length
      ? `<tr><th>Region</th>${items.map(i => `<th class="num">${esc(i.etf.shortName)}</th>`).join("")}<th class="num">Kauf</th></tr>` +
        ETFCalc.FINE.map(f => `<tr><td><span class="dot-region" style="background:${BAR_COLORS[f]}"></span>${ETFCalc.FINE_LABELS[f]}</td>${items.map(i => `<td class="num">${fmtPct1(i.etf.regions[f])}</td>`).join("")}<td class="num"><strong>${fmtPct1(agg.fine[f])}</strong></td></tr>`).join("")
      : `<tr><td class="muted">Noch keine Käufe eingegeben.</td></tr>`;
    sumLine("buy-sum", "Kaufvolumen (monatlich)", byId, state.purchases);
  }
  function buyLive() { updateBuy(); renderProjRates(); updateProjection(); }

  // --- Prognose ---
  const FINE_SHORT = { nordamerika: "N-Am.", europa: "Europa", asien: "Asien", suedamerika: "S-Am.", afrika: "Afrika", australien: "Ozeanien" };

  function renderProjRates() {
    const hById = sumById(state.holdings);
    const pById = sumById(state.purchases);
    const list = ETFS.filter(e => (hById[e.id] || 0) > 0 || (pById[e.id] || 0) > 0);
    const el = document.getElementById("proj-rates");
    if (!list.length) {
      el.innerHTML = `<span class="muted">Noch keine ETFs in Depot oder Sparplan erfasst.</span>`;
      return;
    }
    el.innerHTML = list.map(e => `
      <label class="rate-chip" data-tip="Rendite seit ${esc(e.inception.slice(0, 4))}: ${fmtPct1(e.perf.sinceInceptionPa)} p.a. (real)">
        <span class="rate-dot" style="background:${ETF_COLORS[e.id]}"></span>
        <span class="rate-name">${esc(e.shortName)}</span>
        <input class="rate-v" type="number" id="rate-${e.id}" min="0" max="20" step="0.1" value="${state.rates[e.id]}">
        <span class="rate-unit">%</span>
      </label>`).join("");
    list.forEach(e => {
      document.getElementById("rate-" + e.id).addEventListener("input", ev => {
        state.rates[e.id] = Math.max(0, parseFloat(ev.target.value) || 0);
        save(); updateProjection();
      });
    });
  }

  function updateProjection() {
    const hById = sumById(state.holdings);
    const pById = sumById(state.purchases);
    const holdings = ETFS.map(e => hById[e.id] || 0);
    const monthly = ETFS.map(e => pById[e.id] || 0);
    const rates = ETFS.map(e => state.rates[e.id] || 0);
    const hasInput = holdings.some(v => v > 0) || monthly.some(v => v > 0);
    const table = document.getElementById("proj-table");
    if (!hasInput) {
      table.innerHTML = `<tr><td class="muted">Kein Bestand erfasst und keine monatlichen Käufe im Kauf-Rechner gesetzt.</td></tr>`;
      return;
    }
    const years = [0, 1, 2, 3, 5, 7, 10];
    const proj = ETFCalc.project(ETFS, holdings, monthly, rates, years);
    const startYear = new Date().getFullYear();
    const colLabel = y => y === 0 ? `${startYear} (heute)` : String(startYear + y);
    const head = `<tr><th>Kennzahl</th>${years.map((y, i) => `<th class="num">${colLabel(y)}</th>`).join("")}</tr>`;
    const rows = `<tr><td><strong>Depotwert</strong></td>${proj.map(p => `<td class="num"><strong>${nfEur.format(p.total)}</strong></td>`).join("")}</tr>`
      + ETFCalc.FINE.map(f => `<tr><td><span class="dot-region" style="background:${BAR_COLORS[f]}"></span>${ETFCalc.FINE_LABELS[f]}</td>${proj.map(p => `<td class="num">${fmtPct1(p.fine[f])}</td>`).join("")}</tr>`).join("");
        table.innerHTML = head + rows;
  }

  // --- Init ---
  function exportPayload() {
    return {
      app: "etfplaner", version: 1, exportedAt: new Date().toISOString(),
      holdings: toRowArray(state.holdings), purchases: toRowArray(state.purchases),
      ui: { mode: preferredMode() }
    };
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etf-planer-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function importData(obj) {
    if (!obj || typeof obj !== "object" || (!Array.isArray(obj.holdings) && !Array.isArray(obj.purchases))) {
      alert("Import fehlgeschlagen: Die Datei enthaelt kein gueltiges ETF-Planer-Format (holdings / purchases).");
      return;
    }
    const h = normalizeRows(obj.holdings || []), p = normalizeRows(obj.purchases || []);
    const unknown = h.concat(p).filter(r => r.q && !resolveEtf(r.q)).length;
    const msg = `Import: ${toRowArray(h).length} Bestands- und ${toRowArray(p).length} Kauf-Zeilen laden?`
      + (unknown ? ` ACHTUNG: ${unknown} ${unknown === 1 ? "unbekannte WKN wird" : "unbekannte WKNs werden"} uebernommen, aber nicht gezaehlt.` : "");
    if (!confirm(msg)) return;
    state.holdings.length = 0; state.holdings.push(...h);
    state.purchases.length = 0; state.purchases.push(...p);
    if (obj.ui && typeof obj.ui === "object" && (obj.ui.mode === "dark" || obj.ui.mode === "light")) {
      state.ui.mode = obj.ui.mode;
    }
    save();
    holdEditor.render(); buyEditor.render();
    updateHoldingsSum(); buyLive();
    applyUI();
  }
  document.getElementById("btn-export").addEventListener("click", exportData);
  const importInput = document.getElementById("import-file");
  document.getElementById("btn-import").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", () => {
    const f = importInput.files && importInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { try { importData(JSON.parse(String(reader.result))); } catch (e) { alert("Import fehlgeschlagen: Datei konnte nicht gelesen werden."); } importInput.value = ""; };
    reader.onerror = () => { alert("Import fehlgeschlagen: Datei konnte nicht gelesen werden."); importInput.value = ""; };
    reader.readAsText(f);
  });

  document.getElementById("data-source").textContent = `Stand: ${ETF_DATA.asOf} · Alle Renditen in EUR (XETRA)`;
  document.getElementById("disclaimer").textContent = "Keine Anlageberatung. Statische Daten — Performance der Vergangenheit schlägt sich nicht immer in der Zukunft nieder. Eingaben werden nur lokal im Browser gespeichert.";
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("Alle lokalen Eingaben (Käufe, Bestand, Rendite-Annahmen) löschen?")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  });

  // --- Design: Hell/Dunkel ---
  function preferredMode() {
    if (state.ui.mode) return state.ui.mode;
    try {
      if (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  }
  function applyUI() {
    const mode = preferredMode();
    const root = document.documentElement;
    if (root && root.setAttribute) root.setAttribute("data-mode", mode);
    const sun = document.getElementById("ico-sun"), moon = document.getElementById("ico-moon");
    if (sun) sun.hidden = mode !== "dark";
    if (moon) moon.hidden = mode === "dark";
  }
  document.getElementById("btn-mode").addEventListener("click", () => {
    state.ui.mode = preferredMode() === "dark" ? "light" : "dark";
    save(); applyUI();
  });
  applyUI();

  document.addEventListener("wheel", ev => {
    const t = ev.target;
    if (t && t.type === "number") t.blur();
  }, { passive: true });

  const buyEditor = createRowEditor("buy-rows", state.purchases, buyLive);
  const holdEditor = createRowEditor("holdings-rows", state.holdings, holdingsLive);
  updateBuy();
  updateHoldingsSum();
  renderProjRates();
  updateProjection();
})();
