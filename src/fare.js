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

function toStr(value) {
  return value == null ? "" : String(value).trim();
}

function toNumber(value) {
  if (value == null || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
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

function isWeightCarrier(carrier) {
  const c = normalizeCarrierName(carrier);
  return c === "西濃" || c === "久留米";
}

function roundUpTo100(value) {
  const n = toNumber(value);
  if (n <= 0) return 0;
  return Math.ceil(n / 100) * 100;
}

function getChargeableWeight(product) {
  const actualWeight = toNumber(product?.["実重量"]);
  const m3Weight = toNumber(product?.["m3重量"]);
  return Math.max(actualWeight, m3Weight);
}

function getSize(product) {
  return toNumber(product?.["基準サイズ"]);
}

function findRegionRow(regionRows, carrier, prefecture) {
  const c = normalizeCarrierName(carrier);
  const p = toStr(prefecture);

  return (
    regionRows.find(
      (r) =>
        normalizeCarrierName(r["運送会社"]) === c &&
        toStr(r["都道府県"]).replace(/\s/g, "") === p.replace(/\s/g, "")
    ) || null
  );
}

function resolveRegionCode(regionRows, carrier, prefecture) {
  const row = findRegionRow(regionRows, carrier, prefecture);
  if (!row) return 0;

  const rawRegion = toNumber(row["地域"]);

  if (normalizeCarrierName(carrier) === "西濃") {
    return roundUpTo100(rawRegion);
  }

  return rawRegion;
}

function findSizeFareRow(carrierRows, carrier, size, region) {
  const c = normalizeCarrierName(carrier);

  return (
    carrierRows.find(
      (row) =>
        normalizeCarrierName(row["運送会社"]) === c &&
        toNumber(row["サイズ"]) === size &&
        toNumber(row["地域"]) === region
    ) || null
  );
}

function findWeightFareRow(rows, region, weight) {
  const targetRegion = toNumber(region);
  const targetWeight = toNumber(weight);

  return (
    rows
      .filter((row) => toNumber(row["地域"]) === targetRegion)
      .sort((a, b) => toNumber(a["重量"]) - toNumber(b["重量"]))
      .find((row) => toNumber(row["重量"]) >= targetWeight) || null
  );
}

function calcFareForSizeCarrier({ carrierRows, carrier, size, region }) {
  const row = findSizeFareRow(carrierRows, carrier, size, region);
  if (!row) return null;

  return {
    calcType: "size",
    matchedSize: toNumber(row["サイズ"]),
    matchedWeight: 0,
    fare: toNumber(row["運賃"]),
    islandFee: toNumber(row["離島加算"]),
    relayFee: toNumber(row["中継料"]),
  };
}

function calcFareForWeightCarrier({
  carrier,
  carriersRows,
  seinoRows,
  weight,
  region,
}) {
  const c = normalizeCarrierName(carrier);

  let rows = [];

  if (c === "西濃") rows = seinoRows;
  if (c === "久留米")
    rows = carriersRows.filter(
      (r) => normalizeCarrierName(r["運送会社"]) === "久留米"
    );

  const row = findWeightFareRow(rows, region, weight);
  if (!row) return null;

  return {
    calcType: "weight",
    matchedSize: 0,
    matchedWeight: toNumber(row["重量"]),
    fare: toNumber(row["運賃"]),
    islandFee: toNumber(row["離島加算"]),
    relayFee: toNumber(row["中継料"]),
  };
}

function buildCandidates(product) {
  const candidates = [];

  CANDIDATE_FIELDS.forEach((field, index) => {
    const originalCarrier = normalizeCarrierName(product?.[field]);
    if (!originalCarrier) return;

    candidates.push({
      slot: index + 1,
      source: field,
      originalCarrier,
      carrier: originalCarrier,
      priorityIndex: index + 1,
      replacedFromSeino: false,
    });
  });

  return candidates;
}

function sortResults(results) {
  return [...results].sort((a, b) => {
    if (a.total !== b.total) return a.total - b.total;
    return a.priorityIndex - b.priorityIndex;
  });
}

export function calculateFareResults({
  product,
  prefecture,
  carrierRegions = [],
  carriers = [],
  carriersSeino = [],
}) {
  if (!product || !prefecture) return [];

  const size = getSize(product);
  const weight = getChargeableWeight(product);
  const candidates = buildCandidates(product);

  const results = candidates.map((candidate) => {
    const carrier = candidate.carrier;
    const region = resolveRegionCode(
      carrierRegions,
      carrier,
      prefecture
    );

    let fareResult = null;

    if (isWeightCarrier(carrier)) {
      fareResult = calcFareForWeightCarrier({
        carrier,
        carriersRows: carriers,
        seinoRows: carriersSeino,
        weight,
        region,
      });
    } else {
      fareResult = calcFareForSizeCarrier({
        carrierRows: carriers,
        carrier,
        size,
        region,
      });
    }

    if (!fareResult) {
      return {
        ...candidate,
        region,
        size,
        chargeableWeight: weight,
        total: 0,
        error: "未一致",
      };
    }

    const total =
      fareResult.fare +
      fareResult.islandFee +
      fareResult.relayFee;

    return {
      ...candidate,
      region,
      size,
      chargeableWeight: weight,
      ...fareResult,
      total,
      error: "",
    };
  });

  const sorted = sortResults(results);
  const cheapest =
    sorted.length > 0
      ? Math.min(...sorted.map((r) => r.total || Infinity))
      : null;

  return sorted.map((row) => ({
    ...row,
    isCheapest: row.total === cheapest,
    cheapestBadge: row.total === cheapest ? "最安" : "",
    candidateLabel: `候補元: ${row.source}`,
    displayCarrierNote: "",
  }));
}

export function buildFareResults(params) {
  return calculateFareResults(params);
}

export function findBestFare(params) {
  const results = calculateFareResults(params);
  return results.find((r) => r.isCheapest) || null;
}
