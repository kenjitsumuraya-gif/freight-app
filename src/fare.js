// src/fare.js

const CANDIDATE_FIELDS = ["運送便①", "運送便②", "運送便③"];

function toStr(value) {
  if (value == null) return "";
  return String(value).trim();
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
  const p = toStr(prefecture).replace(/\s/g, "");

  return (
    regionRows.find((r) => {
      return (
        normalizeCarrierName(r["運送会社"]) === c &&
        toStr(r["都道府県"]).replace(/\s/g, "") === p
      );
    }) || null
  );
}

function resolveRegionValue(regionRows, carrier, prefecture) {
  const row = findRegionRow(regionRows, carrier, prefecture);
  if (!row) return "";

  const c = normalizeCarrierName(carrier);
  const rawRegion = row["地域"];

  if (c === "西濃") {
    return roundUpTo100(rawRegion);
  }

  if (c === "久留米") {
    return toNumber(rawRegion);
  }

  return toStr(rawRegion);
}

function findSizeFareRow(carrierRows, carrier, size, region) {
  const c = normalizeCarrierName(carrier);
  const targetSize = toNumber(size);
  const targetRegion = toStr(region).replace(/\s/g, "");

  const rows = carrierRows.filter((row) => {
    return (
      normalizeCarrierName(row["運送会社"]) === c &&
      toStr(row["地域"]).replace(/\s/g, "") === targetRegion
    );
  });

  if (!rows.length) return null;

  const exact = rows.find((row) => toNumber(row["サイズ"]) === targetSize);
  if (exact) return exact;

  const larger = rows
    .filter((row) => toNumber(row["サイズ"]) >= targetSize)
    .sort((a, b) => toNumber(a["サイズ"]) - toNumber(b["サイズ"]))[0];

  if (larger) return larger;

  const maxRow = rows
    .filter((row) => toNumber(row["サイズ"]) > 0)
    .sort((a, b) => toNumber(b["サイズ"]) - toNumber(a["サイズ"]))[0];

  return maxRow || null;
}

function findWeightFareRow(rows, region, weight) {
  const targetRegion = toNumber(region);
  const targetWeight = toNumber(weight);

  const regionRows = rows.filter(
    (row) => toNumber(row["地域"]) === targetRegion
  );

  if (!regionRows.length) return null;

  const exact = regionRows.find(
    (row) => toNumber(row["重量"]) === targetWeight
  );
  if (exact) return exact;

  const larger = regionRows
    .filter((row) => toNumber(row["重量"]) >= targetWeight)
    .sort((a, b) => toNumber(a["重量"]) - toNumber(b["重量"]))[0];

  if (larger) return larger;

  const maxRow = regionRows
    .sort((a, b) => toNumber(b["重量"]) - toNumber(a["重量"]))[0];

  return maxRow || null;
}

function calcFareForSizeCarrier({ carrierRows, carrier, size, region }) {
  const row = findSizeFareRow(carrierRows, carrier, size, region);
  if (!row) return null;

  const fare = toNumber(row["運賃"]);
  const islandFee = toNumber(row["離島加算"]);
  const relayFee = toNumber(row["中継料"]);

  return {
    calcType: "size",
    matchedSize: toNumber(row["サイズ"]),
    matchedWeight: 0,
    fare,
    islandFee,
    relayFee,
    total: fare + islandFee + relayFee,
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

  if (c === "西濃") {
    const row = findWeightFareRow(seinoRows, region, weight);
    if (!row) return null;

    const fare = toNumber(row["運賃"]);
    const islandFee = toNumber(row["離島加算"]);
    const relayFee = toNumber(row["中継料"] ?? row["中継加算"]);

    return {
      calcType: "weight",
      matchedSize: 0,
      matchedWeight: toNumber(row["重量"]),
      fare,
      islandFee,
      relayFee,
      total: fare + islandFee + relayFee,
    };
  }

  if (c === "久留米") {
    const kurumeRows = carriersRows.filter(
      (r) => normalizeCarrierName(r["運送会社"]) === "久留米"
    );
    const row = findWeightFareRow(kurumeRows, region, weight);
    if (!row) return null;

    const fare = toNumber(row["運賃"]);
    const islandFee = toNumber(row["離島加算"]);
    const relayFee = toNumber(row["中継料"]);

    return {
      calcType: "weight",
      matchedSize: 0,
      matchedWeight: toNumber(row["重量"]),
      fare,
      islandFee,
      relayFee,
      total: fare + islandFee + relayFee,
    };
  }

  return null;
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
    const aRank = a.error ? 1 : 0;
    const bRank = b.error ? 1 : 0;

    if (aRank !== bRank) return aRank - bRank;
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
  const chargeableWeight = getChargeableWeight(product);
  const candidates = buildCandidates(product);

  const results = candidates.map((candidate) => {
    const carrier = candidate.carrier;
    const region = resolveRegionValue(carrierRegions, carrier, prefecture);

    if (
      region === "" ||
      region === 0 ||
      region === null ||
      region === undefined
    ) {
      return {
        ...candidate,
        region: "",
        size,
        chargeableWeight,
        calcType: isWeightCarrier(carrier) ? "weight" : "size",
        matchedSize: 0,
        matchedWeight: 0,
        fare: 0,
        islandFee: 0,
        relayFee: 0,
        total: 0,
        error: "地域未一致",
      };
    }

    let fareResult = null;

    if (isWeightCarrier(carrier)) {
      fareResult = calcFareForWeightCarrier({
        carrier,
        carriersRows: carriers,
        seinoRows: carriersSeino,
        weight: chargeableWeight,
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
        chargeableWeight,
        calcType: isWeightCarrier(carrier) ? "weight" : "size",
        matchedSize: 0,
        matchedWeight: 0,
        fare: 0,
        islandFee: 0,
        relayFee: 0,
        total: 0,
        error: "運賃表未一致",
      };
    }

    return {
      ...candidate,
      region,
      size,
      chargeableWeight,
      ...fareResult,
      error: "",
    };
  });

  const sorted = sortResults(results);

  const validResults = sorted.filter((row) => !row.error);
  const cheapestTotal = validResults.length ? validResults[0].total : null;

  return sorted.map((row) => ({
    ...row,
    isCheapest:
      !row.error && cheapestTotal != null && row.total === cheapestTotal,
    cheapestBadge:
      !row.error && cheapestTotal != null && row.total === cheapestTotal
        ? "最安"
        : "",
    candidateLabel: `候補元: ${row.source}`,
    displayCarrierNote: row.replacedFromSeino ? "西濃→久留米" : "",
  }));
}

export function buildFareResults(params) {
  return calculateFareResults(params);
}

export function findBestFare(params) {
  const results = calculateFareResults(params);
  return results.find((row) => row.isCheapest) || null;
}
