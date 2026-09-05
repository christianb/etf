const ETFCalc = (() => {
  const BUCKETS = ["amerika", "europa", "em", "rest"];
  const FINE = ["nordamerika", "europa", "asien", "suedamerika", "afrika", "australien"];

  const BUCKET_LABELS = { amerika: "Amerika", europa: "Europa", em: "Emerging Markets", rest: "Rest der Welt" };
  const FINE_LABELS = {
    nordamerika: "Nordamerika", europa: "Europa", asien: "Asien",
    suedamerika: "Südamerika", afrika: "Afrika", australien: "Australien/Ozeanien"
  };

  function macroOf(etf) {
    if (etf.marketType === "em") return { amerika: 0, europa: 0, em: 100, rest: 0 };
    const r = etf.regions;
    return { amerika: r.nordamerika, europa: r.europa, em: 0, rest: 100 - r.nordamerika - r.europa };
  }

  function aggregate(items) {
    const total = items.reduce((s, i) => s + i.value, 0);
    const macro = {}; BUCKETS.forEach(b => macro[b] = 0);
    const fine = {}; FINE.forEach(b => fine[b] = 0);
    let ter = 0;
    if (total > 0) {
      for (const it of items) {
        if (it.value <= 0) continue;
        const m = macroOf(it.etf), f = it.etf.regions;
        for (const b of BUCKETS) macro[b] += m[b] * it.value / total;
        for (const b of FINE) fine[b] += (f[b] || 0) * it.value / total;
        ter += it.etf.ter * it.value / total;
      }
    }
    return { total, macro, fine, ter };
  }

  function solveLinearSystem(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      if (Math.abs(M[piv][col]) < 1e-12) return null;
      [M[col], M[piv]] = [M[piv], M[col]];
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const fac = M[r][col] / M[col][col];
        for (let c = col; c <= n; c++) M[r][c] -= fac * M[col][c];
      }
    }
    return M.map((row, i) => row[n] / M[i][i]);
  }

  function solveSubset(M, c, budget, idxs) {
    const k = idxs.length;
    let w;
    if (k === 1) {
      w = [budget];
    } else {
      const lastIdx = idxs[k - 1];
      const others = idxs.slice(0, k - 1);
      const rows = M.length;
      const G = [], r = [];
      for (let i = 0; i < rows; i++) {
        G.push(others.map(j => M[i][j] - M[i][lastIdx]));
        r.push(c[i] - M[i][lastIdx] * budget);
      }
      const A = [], b = [];
      for (let u = 0; u < others.length; u++) {
        let bi = 0;
        for (let i = 0; i < rows; i++) bi += G[i][u] * r[i];
        b.push(bi);
        const arow = [];
        for (let v = 0; v < others.length; v++) {
          let s = 0;
          for (let i = 0; i < rows; i++) s += G[i][u] * G[i][v];
          arow.push(s);
        }
        A.push(arow);
      }
      const uSol = solveLinearSystem(A, b);
      if (!uSol) return null;
      w = [...uSol, budget - uSol.reduce((s, v) => s + v, 0)];
    }
    if (w.some(v => v < -1e-6)) return null;
    const wClean = w.map(v => Math.max(0, v));
    const wFull = M[0].map(() => 0);
    idxs.forEach((j, pos) => wFull[j] = wClean[pos]);
    let cost = 0;
    const nCols = M[0].length;
    for (let i = 0; i < M.length; i++) {
      let pred = 0;
      for (let j = 0; j < nCols; j++) pred += M[i][j] * wFull[j];
      cost += (pred - c[i]) ** 2;
    }
    return { w: wFull, cost };
  }

  function solve(etfs, targets, budget, existing) {
    const n = etfs.length;
    const tPct = BUCKETS.map(b => targets[b] ?? 0);
    const tSum = tPct.reduce((s, v) => s + v, 0);
    const t = tSum > 0 ? tPct.map(v => v / tSum) : tPct.map(() => 0);
    const M = BUCKETS.map(b => etfs.map(e => macroOf(e)[b] / 100));
    const existingTotal = existing ? existing.reduce((s, v) => s + v, 0) : 0;
    const total = budget + existingTotal;
    const c = BUCKETS.map((b, i) => {
      let have = 0;
      if (existing) for (let j = 0; j < n; j++) have += M[i][j] * existing[j];
      return t[i] * total - have;
    });
    let best = null;
    for (let mask = 1; mask < (1 << n); mask++) {
      const idxs = [];
      for (let j = 0; j < n; j++) if (mask & (1 << j)) idxs.push(j);
      const sol = solveSubset(M, c, budget, idxs);
      if (sol && (!best || sol.cost < best.cost - 1e-9)) best = sol;
    }
    const achieved = BUCKETS.map((b, i) => {
      let val = 0;
      for (let j = 0; j < n; j++) val += M[i][j] * ((existing ? existing[j] : 0) + best.w[j]);
      return total > 0 ? val / total * 100 : 0;
    });
    return {
      w: best.w,
      achieved,
      residualPp: achieved.map((a, i) => a - t[i] * 100),
      normalizedTargets: t.map(v => v * 100)
    };
  }

  function parseEuro(str) {
    let s = String(str).replace(/[€\s\u00a0]/g, "");
    if (!s) return NaN;
    const hasDot = s.includes("."), hasComma = s.includes(",");
    if (hasDot && hasComma) {
      s = s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
    } else if (hasComma) {
      s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
    } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    const v = parseFloat(s);
    return isNaN(v) ? NaN : v;
  }

  function parseHoldings(text, etfs) {
    const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const result = {};
    const unknown = [];
    for (const line of lines) {
      const parts = line.split(/[,;\t]+/).map(p => p.trim()).filter(Boolean);
      let idHit = null, value = null;
      for (const p of parts) {
        const up = p.toUpperCase();
        const hit = etfs.find(e => up === e.isin.toUpperCase() || up === e.wkn.toUpperCase());
        if (hit && !idHit) { idHit = hit; continue; }
        const v = parseEuro(p);
        if (!isNaN(v) && value === null) value = v;
      }
      if (idHit && value !== null && value >= 0) {
        result[idHit.id] = (result[idHit.id] || 0) + value;
      } else {
        unknown.push(line);
      }
    }
    return { result, unknown };
  }

  function parseTargets(text) {
    const out = {};
    const tokens = String(text).split(/[\n;/]+/).map(t => t.trim()).filter(Boolean);
    for (const tok of tokens) {
      const m = tok.match(/^([^\d]+?)\s*([\d.,]+)\s*%?$/);
      if (!m) continue;
      const label = m[1].trim().toLowerCase();
      const val = parseEuro(m[2]);
      if (isNaN(val)) continue;
      if (label.startsWith("ame") || label === "usa" || label === "us") out.amerika = val;
      else if (label.startsWith("eur")) out.europa = val;
      else if (label.startsWith("em") || label.includes("schwel") || label.includes("emerg")) out.em = val;
      else if (label.startsWith("res") || label.startsWith("sons") || label.startsWith("übr")) out.rest = val;
    }
    return out;
  }

  function project(etfs, holdings, monthly, rates, years) {
    const H0 = holdings.reduce((s, v) => s + v, 0);
    const M = monthly.reduce((s, v) => s + v, 0);
    return years.map(n => {
      const months = n * 12;
      const values = etfs.map((e, i) => {
        const rm = (rates[i] || 0) / 100 / 12;
        const g = rm === 0 ? 1 : Math.pow(1 + rm, months);
        const annuity = rm === 0 ? (monthly[i] || 0) * months : (monthly[i] || 0) * (g - 1) / rm;
        return holdings[i] * g + annuity;
      });
      const total = values.reduce((s, v) => s + v, 0);
      const paidIn = H0 + M * months;
      const agg = aggregate(etfs.map((e, i) => ({ etf: e, value: values[i] })).filter(x => x.value > 0));
      return { years: n, total, paidIn, gain: total - paidIn, values, fine: agg.fine, macro: agg.macro };
    });
  }

  return { BUCKETS, FINE, BUCKET_LABELS, FINE_LABELS, macroOf, aggregate, solve, project, parseEuro, parseHoldings, parseTargets };
})();

if (typeof module !== "undefined") module.exports = ETFCalc;
