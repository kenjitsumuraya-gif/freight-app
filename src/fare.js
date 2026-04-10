// src/fare.js

const CANDIDATE_FIELDS = ["運送便①", "運送便②", "運送便③"];

const SAGAWA_REGION_BY_PREFECTURE = {
  北海道: "北海道",

  青森県: "北東北",
  岩手県: "北東北",
  秋田県: "北東北",

  宮城県: "南東北",
  山形県: "南東北",
  福島県: "南東北",

  茨城県: "関東",
  栃木県: "関東",
  群馬県: "関東",
  埼玉県: "関東",
  千葉県: "関東",
  東京都: "関東",
  神奈川県: "関東",
  山梨県: "関東",

  新潟県: "信越",
  長野県: "信越",

  富山県: "北陸",
  石川県: "北陸",
  福井県: "北陸",

  岐阜県: "東海",
  静岡県: "東海",
  愛知県: "東海",
  三重県: "東海",

  滋賀県: "関西",
  京都府: "関西",
  大阪府: "関西",
  兵庫県: "関西",
  奈良県: "関西",
  和歌山県: "関西",

  鳥取県: "中国",
  島根県: "中国",
  岡山県: "中国",
  広島県: "中国",
  山口県: "中国",

  徳島県: "四国",
  香川県: "四国",
  愛媛県: "四国",
  高知県: "四国",

  福岡県: "北九州",
  佐賀県: "北九州",
  長崎県: "北九州",
  大分県: "北九州",

  熊本県: "南九州",
  宮崎県: "南九州",
  鹿児島県: "南九州",

  沖縄県: "沖縄",
};

function toStr(value) {
  if (value == null) return "";
  return String(value).trim();
}

function toNumber(value) {
  if (value == null || value === "") return 0;

  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (
    normalized === "" ||
    normalized === "-" ||
    normalized === "." ||
    normalized === "-."
  ) {
    return 0;
  }

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

// m3重量は使わない
function getChargeableWeight(product) {
  return toNumber(product?.["実重量"]);
}

function getSize(product) {
  return toNumber(product?.["基準サイズ"]);
}

function isSeinoSpecialTableOn(product) {
  const raw = toStr(product?.["西濃別表"]).toLowerCase();
  return raw === "1" || raw === "true";
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

function normalizeFareRegionForCarrier(carrier, prefecture, rawRegion) {
  const c = normalizeCarrierName(carrier);
  const p = toStr(prefecture);
  const region = toStr(rawRegion);

  if (c === "佐川") {
    return SAGAWA_REGION_BY_PREFECTURE[p] || region;
  }

  return region;
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

  return normalizeFareRegionForCarrier(c, prefecture, rawRegion);
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

  const regionRows = rows
    .filter((row) => toNumber(row["地域"]) === targetRegion)
    .map((row) => ({
      ...row,
      __weight: toNumber(row["重量"]),
    }))
    .filter((row) => row.__weight > 0)
    .sort((a, b) => a.__weight - b.__weight);

  if (!regionRows.length) return null;

  const exact = regionRows.find((row) => row.__weight === targetWeight);
  if (exact) return exact;

  const larger = regionRows.find((row) => row.__weight >= targetWeight);
  if (larger) return larger;

  return regionRows[regionRows.length - 1] || null;
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
  useSeinoSpecialTable,
}) {
  const c = normalizeCarrierName(carrier);

  if (c === "西濃") {
    const baseRows = useSeinoSpecialTable
      ? seinoRows
      : carriersRows.filter(
          (r) => normalizeCarrierName(r["運送会社"]) === "西濃"
        );

    const row = findWeightFareRow(baseRows, region, weight);
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
  const chargeableWeight = getChargeableWeight(product);
  const useSeinoSpecialTable = isSeinoSpecialTableOn(product);
  const candidates = buildCandidates(product);

  const rawResults = candidates.map((candidate) => {
    const carrier = candidate.carrier;
    const region = resolveRegionValue(carrierRegions, carrier, prefecture);

    if (
      region === "" ||
      region === 0 ||
      region === null ||
      region === undefined
    ) {
      return null;
    }

    let fareResult = null;

    if (isWeightCarrier(carrier)) {
      fareResult = calcFareForWeightCarrier({
        carrier,
        carriersRows: carriers,
        seinoRows: carriersSeino,
        weight: chargeableWeight,
        region,
        useSeinoSpecialTable,
      });
    } else {
      fareResult = calcFareForSizeCarrier({
        carrierRows: carriers,
        carrier,
        size,
        region,
      });
    }

    if (!fareResult) return null;
    if (fareResult.total <= 0) return null;

    return {
      ...candidate,
      region,
      size,
      chargeableWeight,
      ...fareResult,
    };
  });

  const results = rawResults.filter(Boolean);
  const sorted = sortResults(results);
  const cheapestTotal = sorted.length ? sorted[0].total : null;

  return sorted.map((row) => ({
    ...row,
    isCheapest: cheapestTotal != null && row.total === cheapestTotal,
    cheapestBadge:
      cheapestTotal != null && row.total === cheapestTotal ? "最安" : "",
    candidateLabel: `候補元: ${row.source}`,
    displayCarrierNote: "",
  }));
}

export function buildFareResults(params) {
  return calculateFareResults(params);
}

export function findBestFare(params) {
  const results = calculateFareResults(params);
  return results.find((row) => row.isCheapest) || null;
}
