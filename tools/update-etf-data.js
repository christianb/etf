const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data.js");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const REGION_MAP = {
  "North America": "nordamerika",
  "Europe": "europa",
  "Asia": "asien",
  "Australia": "australien",
  "South America": "suedamerika",
  "Africa": "afrika"
};

const REGION_ORDER = ["nordamerika", "europa", "asien", "australien", "suedamerika", "afrika"];
const PERF_ORDER = ["y1", "y3", "y5", "sinceInceptionTotal", "sinceInceptionPa"];

const isinRe = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

function round2(v) {
  return Math.round(v * 100) / 100;
}

function normalizeIsin(input) {
  return String(input).trim().toUpperCase();
}

async function fetchPayload(isin) {
  const url = "https://www.finanzfluss.de/informer/etf/" + isin.toLowerCase() + "/_payload.json";
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  } catch (e) {
    throw new Error("Netzwerkfehler beim Abruf von " + url + ": " + e.message);
  }
  if (res.status === 404) throw new Error("ISIN " + isin + " nicht gefunden (404) auf Finanzfluss");
  if (!res.ok) throw new Error("Abfrage fehlgeschlagen HTTP " + res.status);
  const text = await res.text();
  if (!text || text.trim() === "" || !text.trim().startsWith("[")) {
    throw new Error("ISIN " + isin + " lieferte keine Produktdaten (Fonds nicht auf Finanzfluss gelistet?)");
  }
  return JSON.parse(text);
}

function resolvePayload(p) {
  function isRefMap(v) {
    return (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length > 0 &&
      Object.values(v).every((x) => typeof x === "number" && x >= 0 && x < p.length)
    );
  }
  function resolve(i, stack) {
    if (stack.has(i)) return "<REF>";
    const v = p[i];
    if (Array.isArray(v)) {
      return v.map((x) => (typeof x === "number" ? resolve(x, stack) : x));
    }
    if (isRefMap(v)) {
      const next = new Set(stack);
      next.add(i);
      const out = {};
      for (const [k, val] of Object.entries(v)) out[k] = resolve(val, next);
      return out;
    }
    return v;
  }
  return resolve(0, new Set());
}

function findProduct(root, isin) {
  const key = "informer-product-" + isin;
  const data = root.data;
  if (!Array.isArray(data)) throw new Error("Payload-Struktur unerwartet");
  for (const entry of data) {
    if (entry && typeof entry === "object" && entry[key]) return entry[key];
  }
  throw new Error("Produktdaten fuer " + isin + " nicht im Payload gefunden");
}

function shortNameOf(name, baseIndexName) {
  let s = name;
  s = s.replace(/^(Amundi|iShares|Vanguard|Xtrackers|SPDR|Invesco|HSBC|Lyxor|UBS|ComStage|db x-trackers)\s+/i, "");
  s = s.replace(/\s*UCITS\s*ETF.*$/i, "");
  s = s.replace(/\s*\(Acc\)\s*$/i, "").replace(/\s*\([A-Z]{3}\)\s*$/i, "");
  s = s.trim();
  if (s) return s;
  if (baseIndexName) {
    const m = baseIndexName.match(/^MSCI\s+(.+?)(?:\s+(?:ESG|SRI|CTB|Select|IMI|World|NR|USD|EUR|Core|Index|Value|Growth|Momentum|Quality|Min|Volatility))?.*$/i);
    if (m) return "MSCI " + m[1];
  }
  return name;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildEtf(prod, existing) {
  const perfTotal = prod.latestPerformanceTotalPrice || {};
  const perfNom = prod.latestNominalTotalReturn || {};
  const regions = {};
  for (const r of REGION_ORDER) regions[r] = 0;
  for (const d of prod.regionDistributions || []) {
    const k = REGION_MAP[d.name];
    if (k) regions[k] = round2(d.weighting);
  }
  const primary = (prod.stockExchanges || []).find((e) => e.isPrimary) || {};
  const xetraEur = (prod.stockExchanges || []).find((e) => e.stockExchange && e.stockExchange.ticker === "XETR" && (e.currency || {}).isoCode === "EUR") || primary;
  const baseIndexName = (prod.baseIndex || {}).name || "";
  const isin = normalizeIsin(prod.isin);

  const perf = {
    y1: perfNom.return1Year ?? null,
    y3: perfNom.return3Years ?? null,
    y5: perfNom.return5Years ?? null,
    sinceInceptionTotal: perfTotal.performanceSinceInception ?? null,
    sinceInceptionPa: perfNom.returnSinceInception ?? null
  };

  const name = prod.name;
  const nameL = name.toLowerCase();
  let marketType = existing ? existing.marketType : (nameL.includes("emerging") ? "em" : "dm");
  let defaultRate = existing ? existing.defaultRate : (nameL.includes("emerging") ? 8.5 : (nameL.includes("emu") || nameL.includes("europe") ? 7.0 : 8.0));
  let shortName = existing ? existing.shortName : shortNameOf(name, baseIndexName);
  let id = existing ? existing.id : slugify(shortName);
  let color = existing ? existing.color : null;

  return {
    id,
    color,
    defaultRate,
    name,
    shortName,
    isin,
    wkn: prod.wkn || "",
    ticker: xetraEur.ticker || "",
    ter: prod.totalExpenseRatio,
    fundCurrency: (prod.currency || {}).isoCode || "EUR",
    tradingCurrency: (prod.preferredPriceSeries || {}).currency?.isoCode || "EUR",
    replication: String(prod.replicationMethod || "").includes("physical") ? "physisch" : "synthetisch",
    distribution: prod.distributionType === "distributing" ? "ausschuettend" : "thesaurierend",
    inception: prod.releaseDate || null,
    volume: round2((prod.fundVolume || 0) / 1e9),
    marketType,
    perf,
    vol1y: prod.latestRiskKpis?.volatilityOneYear ?? null,
    maxDd1y: prod.latestRiskKpis?.drawdownOneYear ?? null,
    regions,
    link: "https://www.finanzfluss.de/informer/etf/" + isin.toLowerCase() + "/",
    asOf: perfTotal.endDate || null,
    isNew: !existing,
    needsReview: !existing
  };
}

function fmtNum(v) {
  if (v === null || v === undefined) return null;
  return Math.round(v * 100) / 100;
}

function fmtNumStr(v) {
  if (v === null) return "null";
  const r = Math.round(v * 100) / 100;
  if (r === 0 && v === 0) return "0";
  return r.toFixed(2);
}

function serialize(data) {
  const etfs = data.etfs;
  const lines = [];
  lines.push("const ETF_DATA = {");
  lines.push('  source: "Finanzfluss / justETF (XETRA, EUR-Renditen)",');
  lines.push('  asOf: "' + data.asOf + '",');
  lines.push("  etfs: [");
  etfs.forEach((e, i) => {
    lines.push("    {");
    lines.push('      id: "' + e.id + '",');
    lines.push('      color: "' + e.color + '",');
    lines.push("      defaultRate: " + fmtNum(e.defaultRate).toFixed(1) + ",");
    lines.push('      name: "' + e.name + '",');
    lines.push('      shortName: "' + e.shortName + '",');
    lines.push('      isin: "' + e.isin + '",');
    lines.push('      wkn: "' + e.wkn + '",');
    lines.push('      ticker: "' + e.ticker + '",');
    lines.push("      ter: " + fmtNum(e.ter).toFixed(2) + ",");
    lines.push('      fundCurrency: "' + e.fundCurrency + '",');
    lines.push('      tradingCurrency: "' + e.tradingCurrency + '",');
    lines.push('      replication: "' + e.replication + '",');
    lines.push('      distribution: "' + e.distribution + '",');
    lines.push('      inception: "' + e.inception + '",');
    lines.push("      volume: " + fmtNum(e.volume).toFixed(2) + ",");
    lines.push('      marketType: "' + e.marketType + '",');
    const perfStr = PERF_ORDER.map((k) => k + ": " + fmtNumStr(e.perf[k])).join(", ");
    lines.push("      perf: { " + perfStr + " },");
    lines.push("      vol1y: " + fmtNumStr(e.vol1y) + ",");
    lines.push("      maxDd1y: " + fmtNumStr(e.maxDd1y) + ",");
    const regStr = REGION_ORDER.map((k) => k + ": " + fmtNumStr(e.regions[k])).join(", ");
    lines.push("      regions: { " + regStr + " },");
    lines.push('      link: "' + e.link + '"');
    lines.push("    }" + (i < etfs.length - 1 ? "," : ""));
  });
  lines.push("  ]");
  lines.push("};");
  return lines.join("\n") + "\n";
}

async function main() {
  const isins = process.argv.slice(2).map(normalizeIsin).filter(Boolean);
  if (isins.length === 0) {
    console.error("Aufruf: node tools/update-etf-data.js <ISIN> [<ISIN> ...]");
    process.exit(1);
  }
  for (const isin of isins) {
    if (!isinRe.test(isin)) {
      console.error("Ungueltige ISIN: " + isin);
      process.exit(1);
    }
  }

  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const match = raw.match(/const ETF_DATA = (\{[\s\S]*\});\s*$/);
  if (!match) {
    console.error("data.js konnte nicht geparst werden");
    process.exit(1);
  }
  const data = eval("(" + match[1] + ")");

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  for (const isin of isins) {
    console.log("Lade " + isin + " von Finanzfluss ...");
    const payload = await fetchPayload(isin);
    const root = resolvePayload(payload);
    const prod = findProduct(root, isin);
    const existing = data.etfs.find((e) => e.isin === isin);
    const etf = buildEtf(prod, existing);
    data.asOf = etf.asOf || todayStr;

    if (existing) {
      Object.assign(existing, etf);
      console.log("  Aktualisiert: " + etf.name + " (" + etf.wkn + ")");
    } else {
      if (!etf.color) {
        const palette = ["#ef4444", "#ec4899", "#f97316", "#14b8a6", "#6366f1", "#a3e635"];
        etf.color = palette[data.etfs.length % palette.length];
      }
      data.etfs.push(etf);
      console.log("  Neu hinzugefuegt: " + etf.name + " (" + etf.wkn + ")");
      console.log("  HINWEIS: manuelle Felder (id, color, defaultRate, marketType, shortName) wurden automatisch belegt - bitte pruefen.");
    }
  }

  fs.writeFileSync(DATA_FILE, serialize(data));
  console.log("data.js aktualisiert (asOf=" + data.asOf + ").");
}

main().catch((err) => {
  console.error("Fehler: " + err.message);
  process.exit(1);
});