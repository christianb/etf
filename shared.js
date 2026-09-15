const ETFS = ETF_DATA.etfs;

const BAR_COLORS = { nordamerika: "#eab308", europa: "#3b82f6", asien: "#22c55e", suedamerika: "#ef4444", afrika: "#92400e", australien: "#a855f7" };
const ETF_COLORS = Object.fromEntries(ETFS.map(e => [e.id, e.color]));

function fmtEuro(v) {
  const n = new Intl.NumberFormat(I18N.numLocale, { maximumFractionDigits: 0 }).format(Math.round(v));
  return I18N.current === "en" ? `€\u00a0${n}` : `${n}\u00a0€`;
}
const fmtPct = v => v == null ? "—" : (Number(v) / 100).toLocaleString(I18N.numLocale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/\u00a0/g, " ");
const fmtPct1 = v => ((Number(v) || 0) / 100).toLocaleString(I18N.numLocale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/\u00a0/g, " ");
const fmtPerf = v => v == null ? '<span class="muted">—</span>' : `<span class="${v >= 0 ? "pos" : "neg"}">${v >= 0 ? "+" : ""}${v.toLocaleString(I18N.numLocale, { maximumFractionDigits: 2 })} %</span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtAxisEuro = v => {
  const abs = Math.abs(v);
  const dec = x => x.toLocaleString(I18N.numLocale, { maximumFractionDigits: 1 });
  const suffix = k => I18N.current === "en" ? k : k === "K" ? " Tsd." : " Mio.";
  if (abs >= 1e6) return dec(v / 1e6) + suffix("M") + "\u00a0€";
  if (abs >= 1e3) return dec(v / 1e3) + suffix("K") + "\u00a0€";
  return dec(v) + "\u00a0€";
};

const WORLD_GRID = [
  ".........................NNNNNNN.NNNNNNNN...........................................................",
  "..........................NNN.NNNNNNNNNNNNNNN.........E.......................A.....................",
  "...............NN.................NNNNNNNNNN.....................A........AAAAAA....................",
  ".....NNNN.....N....NNN.NNNNNNNN....NNNNNNNN.............EEE..........A.AAAAAAAAAAAAAAAAAAAAAAA......",
  "A.A.NNNNNNNNNNNNNNNNNNNNNNN...NNN..NNNNN.....E........EEEEA.A.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "....NNNNNNNNNNNNNNNNNNNN............NN..............EEE.EEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "......N.....NNNNNNNNNNNN....NNN.....................EEE..EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.....A.....",
  "....N.........NNNNNNNNNNNNN.NNNNNN...............E..E...EEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.....AA.....",
  "...............NNNNNNNNNNNNNNNNNNN...............EEEEEEEEEEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..........",
  "................NNNNNNNNNNNNNN.N.................EEEEEEEEEEE.AAAAAAAAAAAAAAAAAAAAAAAAAAAAA..........",
  "...............NNNNNNNNNNNNNNN.................EEEE..E.EEE...AA.AAAAAAAAAAAAAAAAAAAAAAA..A..........",
  "................NNNNNNNNNNNNN..................E.E....E..AAAAAAA.AAAAAAAAAAAAAAAAAA.................",
  "................NNNNNNNNNNNNN...................F.FFF.......AAAAAAAAAAAAAAAAAAAAAAA..A.AA...........",
  "..................NNNNNNNNN....................FFFFFFF..F.F.AAAAAAAAAAAAAAAAAAAAAAAA................",
  "..................NNNNN....N..................FFFFFFFFFFFFF.AAAA.AAAAAAAAAAAAAAAAAAA................",
  "...................NNNN.......................FFFFFFFFFFFFFF.AAAAA...AAAAAAAAAAAAAAA................",
  ".....................NN..N...................FFFFFFFFFFFFFFF.AAAAA....AAAA..AAA.A...................",
  "........................N....................FFFFFFFFFFFFFFFF.AA......AA....AAAA...A................",
  "..........................N..................FFFFFFFFFFFFFFFFF.........A.....A.A....................",
  "...........................N.SSSS.............FFFFFFFFFFFFFFFFFF.......AA....A......A...............",
  "............................SSSSSSSS................FFFFFFFFFFF...............A...A.................",
  "............................SSSSSSSS.................FFFFFFFFF................A.AAAAAA..............",
  "............................SSSSSSSSSSS..............FFFFFFFF.................A........AAO..........",
  "............................SSSSSSSSSSSS..............FFFFFFF...................A.......AOO.........",
  "............................SSSSSSSSSSSS..............FFFFFFF............................O..........",
  ".............................SSSSSSSSSS..............FFFFFFFF..F.....................OOO.O..........",
  "..............................SSSSSSSSS...............FFFFFF..FF....................OOOOOOO.........",
  "..............................SSSSSSSS................FFFFFF..F...................OOOOOOOOOO........",
  "..............................SSSSSSS.................FFFFF.......................OOOOOOOOOOO.......",
  "..............................SSSSSS...................FFF........................OOOOOOOOOOO.......",
  "..............................SSSSS....................F..........................O.....OOOO........",
  "..............................SSSS........................................................O........O",
  ".............................SSS..........................................................O.........",
  ".............................SS.....................................................................",
  ".............................SS.....................................................................",
  "..............................S....................................................................."
];
const GRID_CHAR = { N: "nordamerika", S: "suedamerika", E: "europa", F: "afrika", A: "asien", O: "australien" };
const CELL_W = 4, CELL_H = 6;
const MAP_LIGHT = [219, 234, 254], MAP_DARK = [23, 78, 208];

function intensityFill(pct) {
  const t = Math.min(1, Math.max(0.03, pct / 100));
  const c = MAP_LIGHT.map((l, i) => Math.round(l + (MAP_DARK[i] - l) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function worldMapSVG(regions, cls) {
  const rects = [];
  WORLD_GRID.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      const region = GRID_CHAR[ch];
      const pct = regions[region] || 0;
      const covered = pct > 0.04;
      const fill = covered ? intensityFill(pct) : "#dfe3e8";
      rects.push(`<rect x="${x * CELL_W}" y="${y * CELL_H}" width="${CELL_W - 1}" height="${CELL_H - 1}" rx="1" fill="${fill}"><title>${t("fine." + region)}${covered ? ": " + fmtPct1(pct) : " — " + t("map.not")}</title></rect>`);
    }
  });
  const w = WORLD_GRID[0].length * CELL_W, h = WORLD_GRID.length * CELL_H;
  const PAD = 8, PADV = 10;
  return `<svg class="${cls || "worldmap"}" viewBox="${-PAD} ${-PADV} ${w + 2*PAD} ${h + 2*PADV}" shape-rendering="crispEdges" role="img" aria-label="${t("map.aria")}">${rects.join("")}</svg>`;
}

function niceMax(v) {
  if (!(v > 0)) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / base;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find(s => f <= s + 1e-9) || 10;
  return step * base;
}

function stackedAreaSVG(labels, series, opts) {
  opts = opts || {};
  const n = labels.length;
  const W = 760, H = 300;
  const padL = 66, padR = 14, padT = 14, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const stacks = [];
  let max = 0;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const row = series.map(s => { acc += Number(s.values[i]) || 0; return acc; });
    stacks.push(row);
    if (acc > max) max = acc;
  }
  const yMax = niceMax(max);
  const x = i => padL + (n <= 1 ? iw / 2 : iw * i / (n - 1));
  const y = v => padT + ih * (1 - v / yMax);
  const yFmt = opts.yFormat || (v => String(Math.round(v)));
  const parts = [];

  for (let g = 0; g <= 4; g++) {
    const val = yMax * g / 4;
    const yy = y(val).toFixed(1);
    parts.push(`<line class="chart-grid" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"></line>`);
    parts.push(`<text class="chart-axis" x="${padL - 8}" y="${(y(val) + 3.5).toFixed(1)}" text-anchor="end">${esc(yFmt(val))}</text>`);
  }

  series.forEach((s, k) => {
    let d = "";
    for (let i = 0; i < n; i++) d += (i ? "L" : "M") + x(i).toFixed(1) + " " + y(stacks[i][k]).toFixed(1) + " ";
    for (let i = n - 1; i >= 0; i--) {
      const base = k === 0 ? 0 : stacks[i][k - 1];
      d += "L" + x(i).toFixed(1) + " " + y(base).toFixed(1) + " ";
    }
    parts.push(`<path d="${d}Z" style="fill:${s.color};fill-opacity:${s.opacity != null ? s.opacity : 0.85}"></path>`);
  });

  const ticks = opts.xticks || labels.map((_, i) => i).filter(i => i % 3 === 0 || i === n - 1);
  ticks.forEach(i => {
    if (i >= n) return;
    parts.push(`<text class="chart-axis" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(labels[i])}</text>`);
  });

  const band = n <= 1 ? iw : iw / (n - 1);
  const markers = [];
  for (let i = 0; i < n; i++) {
    const cx = x(i).toFixed(1);
    const dots = series.map((s, k) => `<circle class="chart-dot" cx="${cx}" cy="${y(stacks[i][k]).toFixed(1)}" r="3.5" style="fill:${s.color}"></circle>`).join("");
    markers.push(`<g class="chart-marker" data-year="${i}"><line class="chart-cursor" x1="${cx}" y1="${padT}" x2="${cx}" y2="${padT + ih}"></line>${dots}</g>`);
  }
  parts.push(`<g class="chart-markers" pointer-events="none">${markers.join("")}</g>`);

  for (let i = 0; i < n; i++) {
    const left = i === 0 ? padL : x(i) - band / 2;
    const right = i === n - 1 ? W - padR : x(i) + band / 2;
    parts.push(`<rect class="chart-hit" data-year="${i}" x="${left.toFixed(1)}" y="${padT}" width="${(right - left).toFixed(1)}" height="${ih}" fill="transparent" pointer-events="all"></rect>`);
  }

  return `<svg class="${opts.cls || "chart"}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || "")}">${parts.join("")}</svg>`;
}
