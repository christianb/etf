const ETFS = ETF_DATA.etfs;

const BAR_COLORS = { nordamerika: "#eab308", europa: "#3b82f6", asien: "#22c55e", suedamerika: "#ef4444", afrika: "#92400e", australien: "#a855f7" };
const ETF_COLORS = Object.fromEntries(ETFS.map(e => [e.id, e.color]));

function fmtEuro(v) { return new Intl.NumberFormat(I18N.numLocale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v); }
const fmtPct = v => v == null ? "—" : (Number(v) / 100).toLocaleString(I18N.numLocale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/\u00a0/g, " ");
const fmtPct1 = v => ((Number(v) || 0) / 100).toLocaleString(I18N.numLocale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/\u00a0/g, " ");
const fmtPerf = v => v == null ? '<span class="muted">—</span>' : `<span class="${v >= 0 ? "pos" : "neg"}">${v >= 0 ? "+" : ""}${v.toLocaleString(I18N.numLocale, { maximumFractionDigits: 2 })} %</span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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
