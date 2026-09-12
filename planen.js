(() => {
  const LS_KEY = "etfplaner.v1";
  const DEFAULT_RATES = Object.fromEntries(ETFS.map(e => [e.id, e.defaultRate]));

  const state = load() || {
    purchases: [],
    holdings: [],
    rates: Object.assign({}, DEFAULT_RATES),
    rateMode: "perEtf",
    rateSingle: 8,
    ui: { mode: null, lang: "de" }
  };
  if (!state.ui) state.ui = { mode: null, lang: "de" };
  if (!state.ui.lang) state.ui.lang = "de";
  if (state.rateMode !== "single") state.rateMode = "perEtf";
  if (!Number.isFinite(state.rateSingle) || state.rateSingle < 0) state.rateSingle = 8;
  setLang(state.ui.lang);

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
      const ui = s.ui && typeof s.ui === "object" ? s.ui : {};
      return {
        purchases: normalizeRows(s.purchases),
        holdings: normalizeRows(s.holdings),
        rates: Object.assign({}, DEFAULT_RATES, s.rates),
        rateMode: s.rateMode === "single" ? "single" : "perEtf",
        rateSingle: Number.isFinite(Number(s.rateSingle)) ? Math.max(0, Number(s.rateSingle)) : 8,
        ui: { mode: ui.mode === "dark" || ui.mode === "light" ? ui.mode : null, lang: ui.lang === "en" ? "en" : "de" }
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

  function renderEtfDatalist() {
    const el = document.getElementById("etf-list");
    if (!el) return;
    const out = [];
    for (const e of ETFS) {
      out.push(`<option value="${esc(e.wkn)}">${esc(e.name)}</option>`);
    }
    el.innerHTML = out.join("");
  }

  function regionBarHTML(agg) {
    const entries = ETFCalc.FINE
      .map(f => ({ label: t("fine." + f), value: agg.fine[f] || 0, color: BAR_COLORS[f] }))
      .filter(x => x.value > 0.04);
    const sum = entries.reduce((s, x) => s + x.value, 0) || 1;
    const bar = entries.map(x => `<div class="region-seg" style="width:${(x.value / sum * 100).toFixed(3)}%;background:${x.color}" title="${esc(x.label)}: ${fmtPct1(x.value)}"></div>`).join("");
    const legend = entries.map(x => `<div class="legend-item"><span class="dot" style="background:${x.color}"></span>${esc(x.label)} · ${fmtPct1(x.value)}</div>`).join("");
    return `<div class="region-bar">${bar}</div><div class="legend region-legend">${legend}</div>`;
  }

  // --- generischer Zeilen-Editor (Bestand + Kauf-Rechner) ---
  const ICON_PLUS = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  const ICON_TRASH = `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M6.5 2h3M4 4l.8 10h6.4L12 4M6.5 7v4M9.5 7v4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
  const GROUP_REGION = { world: "nordamerika", europa: "europa", em: "asien" };

  function groupBadgeStyle(g) {
    return "--grp:" + BAR_COLORS[GROUP_REGION[g]];
  }
  function groupBadgeAttr(g) {
    return ` style="${groupBadgeStyle(g)}"`;
  }

  function rowHTML(r, i, isLast) {
    const known = !String(r.q || "").trim() || !!resolveEtf(r.q);
    const e = resolveEtf(r.q);
    return `<div class="hold-row">
      ${isLast
        ? `<button class="icon-btn" data-act="add" data-idx="${i}" title="${esc(t("row.add"))}">${ICON_PLUS}</button>`
        : `<button class="icon-btn icon-del" data-act="del" data-idx="${i}" title="${esc(t("row.del"))}">${ICON_TRASH}</button>`}
      <input class="hold-q${known ? "" : " input-err"}" data-idx="${i}" data-field="q" value="${esc(r.q)}" placeholder="${esc(t("row.wkn"))}" autocomplete="off" list="etf-list">
      <span class="hold-name-wrap" data-idx="${i}">
        <span class="hold-name" data-idx="${i}" title="${e ? esc(e.name) : ""}">${e ? esc(e.name) : ""}</span>
        <span class="hold-group${e ? "" : " is-hidden"}"${e ? groupBadgeAttr(ETFCalc.groupOf(e)) : ""} data-idx="${i}">${e ? esc(t("grp." + ETFCalc.groupOf(e))) : ""}</span>
      </span>
      <span class="hold-v-wrap${e ? "" : " is-hidden"}" data-idx="${i}">
        <span class="hold-v-euro">€</span>
        <input class="hold-v" type="number" data-idx="${i}" data-field="v" min="0" step="100" value="${r.v}" placeholder="${esc(t("row.amt"))}">
      </span>
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
        const grpEl = el.querySelector ? el.querySelector('.hold-group[data-idx="' + d.idx + '"]') : null;
        if (grpEl) {
          if (e) {
            const g = ETFCalc.groupOf(e);
            grpEl.textContent = t("grp." + g);
            if (grpEl.setAttribute) grpEl.setAttribute("style", groupBadgeStyle(g));
            if (grpEl.classList) grpEl.classList.remove("is-hidden");
          } else {
            grpEl.textContent = "";
            if (grpEl.removeAttribute) grpEl.removeAttribute("style");
            if (grpEl.classList) grpEl.classList.add("is-hidden");
          }
        }
        const vWrap = el.querySelector ? el.querySelector('.hold-v-wrap[data-idx="' + d.idx + '"]') : null;
        if (vWrap && vWrap.classList) vWrap.classList.toggle("is-hidden", !e);
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
    document.getElementById(elId).innerHTML = `<span class="sum-label">${label} · ${positions} ${tpl("sum.pos", positions)}</span><span class="sum-value">${fmtEuro(total)}</span>`
      + (unknown ? `<span class="muted sum-hint">(${unknown} ${tpl("sum.unk", unknown)})</span>` : "");
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
    sumLine("holdings-sum", t("sum.holdings"), sumById(state.holdings), state.holdings);
    updateHoldingsFine();
  }
  function holdingsLive() { updateHoldingsSum(); renderProjRates(); updateProjection(); }

  function updateKpis(projLast) {
    const hTotal = Object.values(sumById(state.holdings)).reduce((s, v) => s + v, 0);
    const mTotal = Object.values(sumById(state.purchases)).reduce((s, v) => s + v, 0);
    const set = (id, txt) => { const n = document.getElementById(id); if (n) n.textContent = txt; };
    set("kpi-holdings", fmtEuro(hTotal));
    set("kpi-buy", fmtEuro(mTotal));
    const lbl = document.getElementById("kpi-proj-label");
    if (lbl) lbl.textContent = t("kpi.proj", { year: new Date().getFullYear() + 15 });
    set("kpi-proj", projLast ? fmtEuro(projLast.total) : "–");
  }

  // --- Kauf-Rechner ---
  function updateBuy() {
    const byId = sumById(state.purchases);
    const items = ETFS.map(e => ({ etf: e, value: byId[e.id] || 0 })).filter(i => i.value > 0);
    const agg = ETFCalc.aggregate(items);
    document.getElementById("buy-fine-bar").innerHTML = items.length ? regionBarHTML(agg) : "";
    document.getElementById("buy-fine").innerHTML = items.length
      ? `<tr><th>${esc(t("buy.colRegion"))}</th>${items.map(i => `<th class="num">${esc(etfShort(i.etf))}</th>`).join("")}<th class="num">${esc(t("buy.colTotal"))}</th></tr>` +
        ETFCalc.FINE.map(f => `<tr><td><span class="dot-region" style="background:${BAR_COLORS[f]}"></span>${t("fine." + f)}</td>${items.map(i => `<td class="num">${fmtPct1(i.etf.regions[f])}</td>`).join("")}<td class="num"><strong>${fmtPct1(agg.fine[f])}</strong></td></tr>`).join("")
      : `<tr><td class="muted">${esc(t("buy.empty"))}</td></tr>`;
    sumLine("buy-sum", t("sum.buy"), byId, state.purchases);
  }
  function buyLive() { updateBuy(); renderProjRates(); updateProjection(); }

  // --- Prognose ---
  function renderRateMode() {
    const el = document.getElementById("rate-mode");
    if (!el || !el.querySelectorAll) return;
    el.querySelectorAll("[data-rate-mode]").forEach(b => {
      const active = b.getAttribute("data-rate-mode") === state.rateMode;
      if (b.classList) b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  function renderProjRates() {
    renderRateMode();
    const hById = sumById(state.holdings);
    const pById = sumById(state.purchases);
    const GROUP_ORDER = { world: 0, europa: 1, em: 2 };
    const list = ETFS.filter(e => (hById[e.id] || 0) > 0 || (pById[e.id] || 0) > 0)
      .sort((a, b) => GROUP_ORDER[ETFCalc.groupOf(a)] - GROUP_ORDER[ETFCalc.groupOf(b)]);
    const el = document.getElementById("proj-rates");
    if (!list.length) {
      el.innerHTML = `<span class="muted">${esc(t("proj.emptyRates"))}</span>`;
      return;
    }
    if (state.rateMode === "single") {
      el.innerHTML = `
      <label class="rate-chip">
        <span class="rate-name">${esc(t("rate.singleName"))}</span>
        <input class="rate-v" type="number" id="rate-single" min="0" max="20" step="0.1" value="${state.rateSingle}">
        <span class="rate-unit">%</span>
      </label>`;
      const inp = document.getElementById("rate-single");
      if (inp) inp.addEventListener("input", ev => {
        state.rateSingle = Math.max(0, parseFloat(ev.target.value) || 0);
        save(); updateProjection();
      });
      return;
    }
    el.innerHTML = list.map(e => `
      <label class="rate-chip" data-tip="${esc(t("proj.rateTip", { year: e.inception.slice(0, 4), pct: fmtPct1(e.perf.sinceInceptionPa) }))}">
        <span class="rate-name">${esc(e.wkn)}</span>
        <span class="rate-group hold-group"${groupBadgeAttr(ETFCalc.groupOf(e))}>${esc(t("grp." + ETFCalc.groupOf(e)))}</span>
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

  function ratesArray() {
    return state.rateMode === "single"
      ? ETFS.map(() => state.rateSingle)
      : ETFS.map(e => state.rates[e.id] || 0);
  }

  function updateProjection() {
    const hById = sumById(state.holdings);
    const pById = sumById(state.purchases);
    const holdings = ETFS.map(e => hById[e.id] || 0);
    const monthly = ETFS.map(e => pById[e.id] || 0);
    const rates = ratesArray();
    const hasInput = holdings.some(v => v > 0) || monthly.some(v => v > 0);
    const table = document.getElementById("proj-table");
    if (!hasInput) {
      table.innerHTML = `<tr><td class="muted">${esc(t("proj.empty"))}</td></tr>`;
      updateKpis(null);
      return;
    }
    const years = [0, 1, 3, 5, 10, 15];
    const proj = ETFCalc.project(ETFS, holdings, monthly, rates, years);
    const startYear = new Date().getFullYear();
    const colLabel = y => y === 0 ? `${startYear} ${t("proj.today")}` : String(startYear + y);
    const head = `<tr><th>${esc(t("proj.colMetric"))}</th>${years.map((y, i) => `<th class="num">${colLabel(y)}</th>`).join("")}</tr>`;
    const rows = `<tr><td><strong>${esc(t("proj.depot"))}</strong></td>${proj.map(p => `<td class="num"><strong>${fmtEuro(p.total)}</strong></td>`).join("")}</tr>`
      + ETFCalc.FINE.map(f => `<tr><td><span class="dot-region" style="background:${BAR_COLORS[f]}"></span>${t("fine." + f)}</td>${proj.map(p => `<td class="num">${fmtPct1(p.fine[f])}</td>`).join("")}</tr>`).join("");
        table.innerHTML = head + rows;
    updateKpis(proj[proj.length - 1]);
  }

  // --- Init ---
  function exportPayload() {
    return {
      app: "etfplaner", version: 1, exportedAt: new Date().toISOString(),
      holdings: toRowArray(state.holdings), purchases: toRowArray(state.purchases),
      rateMode: state.rateMode, rateSingle: state.rateSingle,
      ui: { mode: preferredMode(), lang: I18N.current }
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
      alert(t("imp.failFormat"));
      return;
    }
    const h = normalizeRows(obj.holdings || []), p = normalizeRows(obj.purchases || []);
    const unknown = h.concat(p).filter(r => r.q && !resolveEtf(r.q)).length;
    const msg = t("imp.confirm", { h: toRowArray(h).length, p: toRowArray(p).length })
      + (unknown ? " " + tpl("imp.warn", unknown) : "");
    if (!confirm(msg)) return;
    state.holdings.length = 0; state.holdings.push(...h);
    state.purchases.length = 0; state.purchases.push(...p);
    if (obj.rateMode === "single" || obj.rateMode === "perEtf") state.rateMode = obj.rateMode;
    if (obj.rateSingle != null && Number.isFinite(Number(obj.rateSingle))) {
      state.rateSingle = Math.max(0, Number(obj.rateSingle));
    }
    if (obj.ui && typeof obj.ui === "object" && (obj.ui.mode === "dark" || obj.ui.mode === "light")) {
      state.ui.mode = obj.ui.mode;
    }
    if (obj.ui && typeof obj.ui === "object" && (obj.ui.lang === "en" || obj.ui.lang === "de")) {
      state.ui.lang = obj.ui.lang;
      setLang(obj.ui.lang);
    }
    save();
    renderAll();
    applyUI();
    applyLang();
  }
  document.getElementById("btn-export").addEventListener("click", exportData);
  const importInput = document.getElementById("import-file");
  document.getElementById("btn-import").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", () => {
    const f = importInput.files && importInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { try { importData(JSON.parse(String(reader.result))); } catch (e) { alert(t("imp.badRead")); } importInput.value = ""; };
    reader.onerror = () => { alert(t("imp.badRead")); importInput.value = ""; };
    reader.readAsText(f);
  });

  document.getElementById("data-source").textContent = t("data.source", { date: ETF_DATA.asOf });
  document.getElementById("disclaimer").textContent = t("footer.disclaimer");
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm(t("reset.confirm"))) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  });

  const moreBtn = document.getElementById("btn-more");
  const headerMenu = document.getElementById("header-menu");
  function closeMenu() {
    if (headerMenu) headerMenu.hidden = true;
    if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
  }
  if (moreBtn && headerMenu) {
    headerMenu.hidden = true;
    moreBtn.addEventListener("click", ev => {
      if (ev.stopPropagation) ev.stopPropagation();
      const open = headerMenu.hidden;
      headerMenu.hidden = !open;
      moreBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", ev => {
      if (headerMenu.hidden) return;
      const tgt = ev.target;
      if (tgt && tgt.closest && tgt.closest("#header-menu, #btn-more")) return;
      closeMenu();
    });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape") closeMenu(); });
  }

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
  applyLang();
  renderEtfDatalist();

  const langBtn = document.getElementById("btn-lang");
  if (langBtn) langBtn.addEventListener("click", ev => {
    const seg = ev.target && ev.target.closest ? ev.target.closest("[data-lang]") : null;
    if (!seg || !seg.dataset || !seg.dataset.lang) return;
    setLang(seg.dataset.lang);
    state.ui.lang = I18N.current;
    save(); applyLang(); renderAll();
  });

  const rateModeEl = document.getElementById("rate-mode");
  if (rateModeEl) rateModeEl.addEventListener("click", ev => {
    const seg = ev.target && ev.target.closest ? ev.target.closest("[data-rate-mode]") : null;
    if (!seg || !seg.dataset || !seg.dataset.rateMode) return;
    const mode = seg.dataset.rateMode === "single" ? "single" : "perEtf";
    if (mode === state.rateMode) return;
    state.rateMode = mode;
    save(); renderProjRates(); updateProjection();
  });

  document.addEventListener("wheel", ev => {
    const t = ev.target;
    if (t && t.type === "number") t.blur();
  }, { passive: true });

  const buyEditor = createRowEditor("buy-rows", state.purchases, buyLive);
  const holdEditor = createRowEditor("holdings-rows", state.holdings, holdingsLive);

  function renderAll() {
    holdEditor.render(); buyEditor.render();
    document.getElementById("data-source").textContent = t("data.source", { date: ETF_DATA.asOf });
    document.getElementById("disclaimer").textContent = t("footer.disclaimer");
    updateHoldingsSum(); updateBuy(); renderProjRates(); updateProjection();
  }

  updateBuy();
  updateHoldingsSum();
  renderProjRates();
  updateProjection();
})();
