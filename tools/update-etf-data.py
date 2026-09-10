#!/usr/bin/env python3
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, "data.js")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"

REGION_MAP = {
    "North America": "nordamerika",
    "Europe": "europa",
    "Asia": "asien",
    "Australia": "australien",
    "South America": "suedamerika",
    "Africa": "afrika",
}

REGION_ORDER = ["nordamerika", "europa", "asien", "australien", "suedamerika", "afrika"]
PERF_ORDER = ["y1", "y3", "y5", "sinceInceptionTotal", "sinceInceptionPa"]

ISIN_RE = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$")


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def js_round(x):
    return math.floor(x + 0.5)


def round2(v):
    return js_round(v * 100) / 100


def to_fixed(v, digits):
    factor = 10 ** digits
    return f"{js_round(v * factor) / factor:.{digits}f}"


def js_str(v):
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    return str(v)


def normalize_isin(value):
    return str(value).strip().upper()


def js_object_to_json(text):
    out = []
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c == '"':
            j = i + 1
            while j < n:
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == '"':
                    break
                j += 1
            out.append(text[i:j + 1])
            i = j + 1
            continue
        if c.isalpha() or c in "_$":
            j = i
            while j < n and (text[j].isalnum() or text[j] in "_$"):
                j += 1
            ident = text[i:j]
            k = j
            while k < n and text[k].isspace():
                k += 1
            out.append('"' + ident + '"' if k < n and text[k] == ":" else ident)
            i = j
            continue
        out.append(c)
        i += 1
    return "".join(out)


def fetch_payload(isin):
    url = "https://www.finanzfluss.de/informer/etf/" + isin.lower() + "/_payload.json"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            status = res.getcode()
            text = res.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise RuntimeError("ISIN " + isin + " nicht gefunden (404) auf Finanzfluss")
        raise RuntimeError("Abfrage fehlgeschlagen HTTP " + str(exc.code))
    except Exception as exc:
        raise RuntimeError("Netzwerkfehler beim Abruf von " + url + ": " + str(exc))
    if not (200 <= status < 300):
        raise RuntimeError("Abfrage fehlgeschlagen HTTP " + str(status))
    if not text or text.strip() == "" or not text.strip().startswith("["):
        raise RuntimeError("ISIN " + isin + " lieferte keine Produktdaten (Fonds nicht auf Finanzfluss gelistet?)")
    return json.loads(text)


def resolve_payload(p):
    def is_ref_map(v):
        return (
            isinstance(v, dict)
            and len(v) > 0
            and all(is_number(x) and 0 <= x < len(p) for x in v.values())
        )

    def resolve(i, stack):
        if i in stack:
            return "<REF>"
        v = p[i]
        if isinstance(v, list):
            return [resolve(x, stack) if is_number(x) else x for x in v]
        if is_ref_map(v):
            nxt = set(stack)
            nxt.add(i)
            return {k: resolve(val, nxt) for k, val in v.items()}
        return v

    return resolve(0, set())


def find_product(root, isin):
    key = "informer-product-" + isin
    data = root.get("data") if isinstance(root, dict) else None
    if not isinstance(data, list):
        raise RuntimeError("Payload-Struktur unerwartet")
    for entry in data:
        if isinstance(entry, dict) and entry.get(key):
            return entry[key]
    raise RuntimeError("Produktdaten fuer " + isin + " nicht im Payload gefunden")


def short_name_of(name, base_index_name):
    s = name
    s = re.sub(r"^(Amundi|iShares|Vanguard|Xtrackers|SPDR|Invesco|HSBC|Lyxor|UBS|ComStage|db x-trackers)\s+", "", s, flags=re.I)
    s = re.sub(r"\s*UCITS\s*ETF.*$", "", s, flags=re.I)
    s = re.sub(r"\s*\(Acc\)\s*$", "", s, flags=re.I)
    s = re.sub(r"\s*\([A-Z]{3}\)\s*$", "", s)
    s = s.strip()
    if s:
        return s
    if base_index_name:
        m = re.match(
            r"^MSCI\s+(.+?)(?:\s+(?:ESG|SRI|CTB|Select|IMI|World|NR|USD|EUR|Core|Index|Value|Growth|Momentum|Quality|Min|Volatility))?.*$",
            base_index_name,
            flags=re.I,
        )
        if m:
            return "MSCI " + m.group(1)
    return name


def slugify(s):
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def build_etf(prod, existing):
    perf_total = prod.get("latestPerformanceTotalPrice") or {}
    perf_nom = prod.get("latestNominalTotalReturn") or {}
    regions = {r: 0 for r in REGION_ORDER}
    for d in prod.get("regionDistributions") or []:
        k = REGION_MAP.get(d.get("name"))
        w = d.get("weighting")
        if k and w is not None:
            regions[k] = round2(w)

    exchanges = prod.get("stockExchanges") or []
    primary = {}
    for e in exchanges:
        if e.get("isPrimary"):
            primary = e
            break
    xetra_eur = primary
    for e in exchanges:
        se = e.get("stockExchange") or {}
        cur = e.get("currency") or {}
        if se.get("ticker") == "XETR" and cur.get("isoCode") == "EUR":
            xetra_eur = e
            break

    base_index_name = (prod.get("baseIndex") or {}).get("name") or ""
    isin = normalize_isin(prod.get("isin"))

    perf = {
        "y1": perf_nom.get("return1Year"),
        "y3": perf_nom.get("return3Years"),
        "y5": perf_nom.get("return5Years"),
        "sinceInceptionTotal": perf_total.get("performanceSinceInception"),
        "sinceInceptionPa": perf_nom.get("returnSinceInception"),
    }

    name = prod.get("name")
    name_l = name.lower()
    if existing is not None:
        market_type = existing.get("marketType")
        default_rate = existing.get("defaultRate")
        short_name = existing.get("shortName")
        etf_id = existing.get("id")
        color = existing.get("color")
    else:
        market_type = "em" if "emerging" in name_l else "dm"
        if "emerging" in name_l:
            default_rate = 8.5
        elif "emu" in name_l or "europe" in name_l:
            default_rate = 7.0
        else:
            default_rate = 8.0
        short_name = short_name_of(name, base_index_name)
        etf_id = slugify(short_name)
        color = None

    kpis = prod.get("latestRiskKpis") or {}
    replication_raw = "" if prod.get("replicationMethod") is None else str(prod.get("replicationMethod"))

    return {
        "id": etf_id,
        "color": color,
        "defaultRate": default_rate,
        "name": name,
        "shortName": short_name,
        "isin": isin,
        "wkn": prod.get("wkn") or "",
        "ticker": xetra_eur.get("ticker") or "",
        "ter": prod.get("totalExpenseRatio"),
        "fundCurrency": (prod.get("currency") or {}).get("isoCode") or "EUR",
        "tradingCurrency": ((prod.get("preferredPriceSeries") or {}).get("currency") or {}).get("isoCode") or "EUR",
        "replication": "physisch" if "physical" in replication_raw else "synthetisch",
        "distribution": "ausschuettend" if prod.get("distributionType") == "distributing" else "thesaurierend",
        "inception": prod.get("releaseDate"),
        "volume": round2((prod.get("fundVolume") or 0) / 1e9),
        "marketType": market_type,
        "perf": perf,
        "vol1y": kpis.get("volatilityOneYear"),
        "maxDd1y": kpis.get("drawdownOneYear"),
        "regions": regions,
        "link": "https://www.finanzfluss.de/informer/etf/" + isin.lower() + "/",
        "asOf": perf_total.get("endDate"),
        "isNew": existing is None,
        "needsReview": existing is None,
    }


def fmt_num(v):
    if v is None:
        return None
    return round2(v)


def fmt_num_str(v):
    if v is None:
        return "null"
    r = round2(v)
    if r == 0 and v == 0:
        return "0"
    return to_fixed(r, 2)


def serialize(data):
    etfs = data["etfs"]
    lines = []
    lines.append("const ETF_DATA = {")
    lines.append('  source: "Finanzfluss / justETF (XETRA, EUR-Renditen)",')
    lines.append('  asOf: "' + js_str(data["asOf"]) + '",')
    lines.append("  etfs: [")
    for i, e in enumerate(etfs):
        lines.append("    {")
        lines.append('      id: "' + js_str(e.get("id")) + '",')
        lines.append('      color: "' + js_str(e.get("color")) + '",')
        lines.append("      defaultRate: " + to_fixed(fmt_num(e.get("defaultRate")), 1) + ",")
        lines.append('      name: "' + js_str(e.get("name")) + '",')
        lines.append('      shortName: "' + js_str(e.get("shortName")) + '",')
        lines.append('      isin: "' + js_str(e.get("isin")) + '",')
        lines.append('      wkn: "' + js_str(e.get("wkn")) + '",')
        lines.append('      ticker: "' + js_str(e.get("ticker")) + '",')
        lines.append("      ter: " + to_fixed(fmt_num(e.get("ter")), 2) + ",")
        lines.append('      fundCurrency: "' + js_str(e.get("fundCurrency")) + '",')
        lines.append('      tradingCurrency: "' + js_str(e.get("tradingCurrency")) + '",')
        lines.append('      replication: "' + js_str(e.get("replication")) + '",')
        lines.append('      distribution: "' + js_str(e.get("distribution")) + '",')
        lines.append('      inception: "' + js_str(e.get("inception")) + '",')
        lines.append("      volume: " + to_fixed(fmt_num(e.get("volume")), 2) + ",")
        lines.append('      marketType: "' + js_str(e.get("marketType")) + '",')
        perf = e.get("perf") or {}
        perf_str = ", ".join(k + ": " + fmt_num_str(perf.get(k)) for k in PERF_ORDER)
        lines.append("      perf: { " + perf_str + " },")
        lines.append("      vol1y: " + fmt_num_str(e.get("vol1y")) + ",")
        lines.append("      maxDd1y: " + fmt_num_str(e.get("maxDd1y")) + ",")
        regions = e.get("regions") or {}
        reg_str = ", ".join(k + ": " + fmt_num_str(regions.get(k)) for k in REGION_ORDER)
        lines.append("      regions: { " + reg_str + " },")
        lines.append('      link: "' + js_str(e.get("link")) + '"')
        lines.append("    }" + ("," if i < len(etfs) - 1 else ""))
    lines.append("  ]")
    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    isins = [normalize_isin(a) for a in sys.argv[1:]]
    isins = [i for i in isins if i]
    if not isins:
        sys.stderr.write("Aufruf: python3 tools/update-etf-data.py <ISIN> [<ISIN> ...]\n")
        sys.exit(1)
    for isin in isins:
        if not ISIN_RE.match(isin):
            sys.stderr.write("Ungueltige ISIN: " + isin + "\n")
            sys.exit(1)

    with open(DATA_FILE, encoding="utf-8") as fh:
        raw = fh.read()
    m = re.search(r"const ETF_DATA = (\{[\s\S]*\});\s*$", raw)
    if not m:
        sys.stderr.write("data.js konnte nicht geparst werden\n")
        sys.exit(1)
    data = json.loads(js_object_to_json(m.group(1)))

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for isin in isins:
        print("Lade " + isin + " von Finanzfluss ...")
        payload = fetch_payload(isin)
        root = resolve_payload(payload)
        prod = find_product(root, isin)
        existing = None
        for e in data["etfs"]:
            if e.get("isin") == isin:
                existing = e
                break
        etf = build_etf(prod, existing)
        data["asOf"] = etf["asOf"] or today_str

        if existing is not None:
            existing.update(etf)
            print("  Aktualisiert: " + etf["name"] + " (" + etf["wkn"] + ")")
        else:
            if not etf["color"]:
                palette = ["#ef4444", "#ec4899", "#f97316", "#14b8a6", "#6366f1", "#a3e635"]
                etf["color"] = palette[len(data["etfs"]) % len(palette)]
            data["etfs"].append(etf)
            print("  Neu hinzugefuegt: " + etf["name"] + " (" + etf["wkn"] + ")")
            print("  HINWEIS: manuelle Felder (id, color, defaultRate, marketType, shortName) wurden automatisch belegt - bitte pruefen.")

    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        fh.write(serialize(data))
    print("data.js aktualisiert (asOf=" + data["asOf"] + ").")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write("Fehler: " + str(exc) + "\n")
        sys.exit(1)
