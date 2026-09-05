const geo = require('./countries.geo.json');
const W = 100, H = 36;
const LAT_TOP = 84, LAT_BOT = -56;
const REGION = {
  N: ["GRL","BHS","PRI","TTO","USA","CAN","MEX","GTM","BLZ","HND","SLV","NIC","CRI","PAN","CUB","JAM","HTI","DOM"],
  S: ["FLK","GUF","COL","VEN","ECU","PER","BOL","BRA","ARG","URY","PRY","GUY","SUR","CHL"],
  E: ["EST","LVA","LTU","KOS","CS-KM","ISL","NOR","SWE","FIN","DNK","GBR","IRL","NLD","BEL","LUX","DEU","POL","CZE","SVK","HUN","AUT","CHE","FRA","ESP","PRT","ITA","SVN","HRV","BIH","SRB","MNE","ALB","MKD","GRC","BGR","ROU","UKR","BLR","MDA","MCO","SMR","AND"],
  F: ["MAR","ESH","DZA","TUN","LBY","EGY","MLT","MRT","SEN","GMB","GNB","GIN","SLE","LBR","CIV","GHA","TGO","BEN","NGA","CMR","CAF","GAB","COG","COD","GNQ","ETH","SOM","SOL","DJI","ERI","KEN","TZA","UGA","RWA","BDI","AGO","ZMB","MWI","MOZ","ZWE","MDG","MLI","BFA","NER","TCD","SDN","SSD","NAM","BWA","ZAF","SWZ","LSO"],
  A: ["RUS","TUR","CYP","-99","SYR","LBN","ISR","PSE","JOR","IRQ","IRN","AFG","PAK","IND","NPL","BTN","BGD","MMR","THA","LAO","KHM","VNM","MYS","BRN","SGP","IDN","PHL","JPN","TWN","LKA","CHN","MNG","PRK","KOR","KAZ","KGZ","UZB","TJK","TKM","YEM","OMN","ARE","QAT","BHR","KWT","SAU","GEO","ARM","AZE","TLS"],
  O: ["NCL","AUS","NZL","PNG","FJI","SLB","VUT"]
};
const map = {};
for (const [k, arr] of Object.entries(REGION)) arr.forEach(iso => map[iso] = k);

function pip(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[j];
    if ((y1 > lat) !== (y2 > lat) && lng < (x2 - x1) * (lat - y1) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}
const g = Array.from({length: H}, () => Array(W).fill("."));
const unknown = new Set();
for (const f of geo.features) {
  const iso = f.id;
  if (iso === "ATA" || iso === "ATF") continue;
  let base = map[iso];
  if (!base) { base = "?"; unknown.add(iso + " " + f.properties.name); }
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const ring = poly[0];
    let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
    for (const [lo, la] of ring) { if (la<minLat)minLat=la; if (la>maxLat)maxLat=la; if (lo<minLng)minLng=lo; if (lo>maxLng)maxLng=lo; }
    const y0 = Math.max(0, Math.floor((LAT_TOP-maxLat)/(LAT_TOP-LAT_BOT)*H));
    const y1 = Math.min(H-1, Math.floor((LAT_TOP-minLat)/(LAT_TOP-LAT_BOT)*H));
    const x0 = Math.max(0, Math.floor((minLng+180)/360*W));
    const x1 = Math.min(W-1, Math.floor((maxLng+180)/360*W));
    for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) {
      const lng = (x+0.5)/W*360-180, lat = LAT_TOP-(y+0.5)/H*(LAT_TOP-LAT_BOT);
      if (!pip(lat, lng, ring)) continue;
      let ch = base;
      if (base === "?") continue;
      if (iso === "DNK") ch = lng < -40 ? "N" : "E";
      if (iso === "FRA") ch = lng < -50 ? "S" : lng < -20 ? "N" : (lat < 0 && lng > 40) ? "F" : "E";
      if (iso === "NLD" && lng < -50) ch = "N";
      if (iso === "USA") ch = "N";
      g[y][x] = ch;
    }
  }
}
if (unknown.size) console.error("Unbekannt:", [...unknown].join(" | "));
function cut(cond, label, max) {
  let n = 0;
  for (let pass=0; pass<3 && n<max; pass++)
    for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
      if (g[y][x] !== "." && cond(g[y][x], x, y) && n < max) { g[y][x] = "."; n++; }
    }
  console.log(label + ": " + n + " Zellen entfernt");
}
cut((c, x, y) => {
  const nb = [[y+1,x],[y-1,x],[y,x+1],[y,x-1]].map(([ny,nx]) => g[ny]?.[nx]);
  return c === "E" && nb.includes("F");
}, "Strasse von Gibraltar (E-F Kontakt)", 2);
cut((c, x, y) => {
  const nb = [[y+1,x],[y-1,x],[y,x+1],[y,x-1]].map(([ny,nx]) => g[ny]?.[nx]);
  return c === "N" && nb.includes("S");
}, "Isthmus Panama (N-S Kontakt)", 3);
cut((c, x, y) => {
  const nb = [[y+1,x],[y-1,x],[y,x+1],[y,x-1]].map(([ny,nx]) => g[ny]?.[nx]);
  return c === "A" && nb.includes("F");
}, "Sues (A-F Kontakt)", 2);
require("fs").writeFileSync("world-grid.txt", g.map(r=>r.join("")).join("\n"));
const per = {};
g.join("").split("").filter(c => c !== ".").forEach(c => per[c] = (per[c]||0)+1);
console.error("Pixel:", JSON.stringify(per));
