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
  if (v.includes("福山通運")) return "福山通運";
  if (v.includes("福山")) return "福山通運";

  return v;
}

function isKyushu(prefecture) {
  return KYUSHU_PREFECTURES.has(toStr(prefecture));
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

function isSeinoKurumeFlagOn(product) {
  const raw = toStr(product?.["西濃別表"]);
  return raw === "1" || raw.toLowerCase() === "true";
}

function findRegionRow(regionRows, carrier, prefecture) {
  const c = normalizeCarrierName(carrier);
  const p = toStr(prefecture);

  let row = regionRows.find(
    (r) =>
      normalizeCarrierName(r["運送会社"]) === c &&
      toStr(r["都道府県"]) === p
  );

  if (row) return row;

  row = regionRows.find(
    (r) =>
      normalizeCarrierName(r["運送会社"]) === c &&
      toStr(r["都道府県"]).replace(/\s/g, "") === p.replace(/\s/g, "")
  );

  return row || null;
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
  const s = toNumber(size);
  const r = toNumber(region);

  return (
    carrierRows.find((row) => {
      return (
        normalizeCarrierName(row["運送会社"]) === c &&
        toNumber(row["サイズ"]) === s &&
        toNumber(row["地域"]) === r
      );
    }) || null
  );
}

function findWeightFareRow(rows, region, weight) {
  const targetRegion = toNumber(region);
  const targetWeight = toNumber(weight);

  const exact = rows.find(
    (row) =>
      toNumber(row["地域"]) === targetRegion &&
      toNumber(row["重量"]) === targetWeight
  );
  if (exact) return exact;

  const heavier = rows
    .filter((row) => toNumber(row["地域"]) === targetRegion)
    .sort((a, b) => toNumber(a["重量"]) - toNumber(b["重量"]))
    .find((row) => toNumber(row["重量"]) >= targetWeight);

  return heavier || null;
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

function buildCandidates(product, prefecture) {
  const kyushu = isKyushu(prefecture);
  const useKurumeInsteadOfSeino = kyushu && isSeinoKurumeFlagOn(product);

  const candidates = [];

  CANDIDATE_FIELDS.forEach((field, index) => {
    const originalCarrier = normalizeCarrierName(product?.[field]);
    if (!originalCarrier) return;

    let carrier = originalCarrier;

    // 九州かつ西濃別表フラグONのときだけ、西濃→久留米に置換
    if (useKurumeInsteadOfSeino && originalCarrier === "西濃") {
      carrier = "久留米";
    }

    // 九州以外では久留米を候補に出さない
    if (!kyushu && carrier === "久留米") {
      return;
    }

    candidates.push({
      slot: index + 1,
      source: field,
      originalCarrier,
      carrier,
      priorityIndex: index + 1,
      replacedFromSeino:
        useKurumeInsteadOfSeino &&
        originalCarrier === "西濃" &&
        carrier === "久留米",
    });
  });

  return candidates;
}

function sortResults(results) {
  return [...results].sort((a, b) => {
    if (a.total !== b.total) return a.total - b.total;
    if (a.priorityIndex !== b.priorityIndex) {
      return a.priorityIndex - b.priorityIndex;
    }
    return a.slot - b.slot;
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
  const candidates = buildCandidates(product, prefecture);

  const results = candidates
    .map((candidate) => {
      const carrier = candidate.carrier;
      const region = resolveRegionCode(carrierRegions, carrier, prefecture);

      if (!region) {
        return {
          ...candidate,
          region: 0,
          size,
          chargeableWeight,
          calcType: isWeightCarrier(carrier) ? "weight" : "size",
          matchedSize: 0,
          matchedWeight: 0,
          fare: 0,
          islandFee: 0,
          relayFee: 0,
          total: 0,
          error: "地域コード未取得",
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
    })
    .filter((row) => !row.error);

  const sorted = sortResults(results);
  const cheapestTotal = sorted.length ? sorted[0].total : null;

  return sorted.map((row) => ({
    ...row,
    isCheapest: cheapestTotal != null && row.total === cheapestTotal,
    cheapestBadge:
      cheapestTotal != null && row.total === cheapestTotal ? "最安" : "",
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
