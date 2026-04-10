// src/fare.js

const KYUSHU_PREFECTURES = new Set([
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
]);

const CANDIDATE_FIELDS = ["運送便①", "運送便②", "運送便③"];

function toStr(v) {
  return v == null ? "" : String(v).trim();
}

function toNumber(v) {
  if (v == null || v === "") return 0;
  return Number(String(v).replace(/,/g, "").trim()) || 0;
}

function normalizeCarrierName(name) {
  const v = toStr(name);
  if (!v) return "";

  if (v.includes("西濃")) return "西濃";
  if (v.includes("久留米")) return "久留米";
  if (v.includes("佐川")) return "佐川";
  if (v.includes("ヤマト")) return "ヤマト";
  if (v.includes("福山")) return "福山通運";

  return v;
}

function isKyushu(pref) {
  return KYUSHU_PREFECTURES.has(toStr(pref));
}

function isWeightCarrier(c) {
  c = normalizeCarrierName(c);
  return c === "西濃" || c === "久留米";
}

function roundUpTo100(v) {
  if (!v) return 0;
  return Math.ceil(v / 100) * 100;
}

function getChargeableWeight(product) {
  return toNumber(product?.["実重量"]);
}

function getSize(product) {
  return toNumber(product?.["基準サイズ"]);
}

function isSeinoKurumeFlagOn(product) {
  const raw = toStr(product?.["西濃別表"]);
  return raw === "1" || raw.toLowerCase() === "true";
}

function findRegion(regionRows, carrier, pref) {
  const c = normalizeCarrierName(carrier);
  const p = toStr(pref);

  return regionRows.find(
    (r) =>
      normalizeCarrierName(r["運送会社"]) === c &&
      toStr(r["都道府県"]).replace(/\s/g, "") === p.replace(/\s/g, "")
  );
}

// ★ここが今回の本命修正
function resolveRegionCode(regionRows, carrier, pref) {
  let row = findRegion(regionRows, carrier, pref);

  // 久留米が無い場合 → 西濃で代用
  if (!row && normalizeCarrierName(carrier) === "久留米") {
    row = findRegion(regionRows, "西濃", pref);
  }

  if (!row) return 0;

  let region = toNumber(row["地域"]);

  if (normalizeCarrierName(carrier) === "西濃") {
    region = roundUpTo100(region);
  }

  return region;
}

function findSizeFareRow(rows, carrier, size, region) {
  const c = normalizeCarrierName(carrier);

  return rows
    .filter(
      (r) =>
        normalizeCarrierName(r["運送会社"]) === c &&
        toNumber(r["地域"]) === region
    )
    .sort((a, b) => toNumber(a["サイズ"]) - toNumber(b["サイズ"]))
    .find((r) => toNumber(r["サイズ"]) >= size);
}

function findWeightFareRow(rows, region, weight) {
  return rows
    .filter((r) => toNumber(r["地域"]) === region)
    .sort((a, b) => toNumber(a["重量"]) - toNumber(b["重量"]))
    .find((r) => toNumber(r["重量"]) >= weight);
}

function calcSize({ rows, carrier, size, region }) {
  const row = findSizeFareRow(rows, carrier, size, region);
  if (!row) return null;

  return {
    calcType: "size",
    fare: toNumber(row["運賃"]),
    islandFee: toNumber(row["離島加算"]),
    relayFee: toNumber(row["中継料"]),
    matchedSize: toNumber(row["サイズ"]),
    matchedWeight: 0,
  };
}

function calcWeight({ carrier, carriers, seino, weight, region }) {
  let rows = [];

  if (carrier === "西濃") rows = seino;

  if (carrier === "久留米") {
    const kurume = carriers.filter(
      (r) => normalizeCarrierName(r["運送会社"]) === "久留米"
    );

    rows = kurume.length ? kurume : seino;
  }

  const row = findWeightFareRow(rows, region, weight);
  if (!row) return null;

  return {
    calcType: "weight",
    fare: toNumber(row["運賃"]),
    islandFee: toNumber(row["離島加算"]),
    relayFee: toNumber(row["中継料"]),
    matchedWeight: toNumber(row["重量"]),
    matchedSize: 0,
  };
}

function isValid(carrier, size, weight) {
  return isWeightCarrier(carrier) ? weight > 0 : size > 0;
}

function buildCandidates(product, pref) {
  const kyushu = isKyushu(pref);
  const useKurume = kyushu && isSeinoKurumeFlagOn(product);

  return CANDIDATE_FIELDS.map((f, i) => {
    const original = normalizeCarrierName(product?.[f]);
    if (!original) return null;

    let carrier = original;

    if (useKurume && original === "西濃") carrier = "久留米";

    return {
      slot: i + 1,
      source: f,
      originalCarrier: original,
      carrier,
      priorityIndex: i + 1,
      replacedFromSeino:
        useKurume && original === "西濃" && carrier === "久留米",
    };
  }).filter(Boolean);
}

function sortResults(r) {
  return [...r].sort((a, b) => a.total - b.total);
}

export function calculateFareResults({
  product,
  prefecture,
  carrierRegions = [],
  carriers = [],
  carriersSeino = [],
}) {
  const size = getSize(product);
  const weight = getChargeableWeight(product);

  const results = buildCandidates(product, prefecture)
    .map((c) => {
      if (!isValid(c.carrier, size, weight)) return null;

      const region = resolveRegionCode(
        carrierRegions,
        c.carrier,
        prefecture
      );

      let fare = null;

      if (isWeightCarrier(c.carrier)) {
        fare = calcWeight({
          carrier: c.carrier,
          carriers,
          seino: carriersSeino,
          weight,
          region,
        });
      } else {
        fare = calcSize({
          rows: carriers,
          carrier: c.carrier,
          size,
          region,
        });
      }

      if (!fare) return null;

      const total = fare.fare + fare.islandFee + fare.relayFee;

      return { ...c, ...fare, region, total };
    })
    .filter(Boolean);

  const sorted = sortResults(results);
  const min = sorted[0]?.total;

  return sorted.map((r) => ({
    ...r,
    isCheapest: r.total === min,
    cheapestBadge: r.total === min ? "最安" : "",
    candidateLabel: `候補元: ${r.source}`,
    displayCarrierNote: r.replacedFromSeino ? "西濃→久留米" : "",
  }));
}

export function buildFareResults(p) {
  return calculateFareResults(p);
}

export function findBestFare(p) {
  return calculateFareResults(p)[0] || null;
}
