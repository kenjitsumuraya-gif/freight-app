function toNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isNaN(n) ? 0 : n;
}

function normalizeCarrierName(name) {
  const value = String(name || "").trim();

  if (value.includes("佐川")) return "佐川";
  if (value.includes("西濃")) return "西濃";
  if (value.includes("ヤマト")) return "ヤマト";

  return value;
}

function getShippingWeight(product) {
  return Math.max(
    toNumber(product["実重量"]),
    toNumber(product["m3重量"] || product["m³重量"])
  );
}

function getCarrierRegion(carrier, prefecture, carrierRegions) {
  const normalizedCarrier = normalizeCarrierName(carrier);

  const row = carrierRegions.find(
    (r) =>
      normalizeCarrierName(r["運送会社"]) === normalizedCarrier &&
      String(r["都道府県"]).trim() === String(prefecture).trim()
  );

  return row ? String(row["地域"]).trim() : null;
}

function isSeinoSpecial(product) {
  return String(product["西濃別表"] || "0").trim() === "1";
}

function findSeinoRate(region, weight, rateTable) {
  const rows = rateTable
    .filter(
      (r) =>
        normalizeCarrierName(r["運送会社"]) === "西濃" &&
        String(r["地域"]).trim() === String(region).trim() &&
        String(r["重量"] || "").trim() !== ""
    )
    .sort((a, b) => toNumber(a["重量"]) - toNumber(b["重量"]));

  if (rows.length === 0) return null;

  const matched = rows.find((r) => weight <= toNumber(r["重量"]));
  return matched || rows[rows.length - 1] || null;
}

function findStandardRate(carrier, region, size, carrierRates) {
  const normalizedCarrier = normalizeCarrierName(carrier);

  const rows = carrierRates
    .filter(
      (r) =>
        normalizeCarrierName(r["運送会社"]) === normalizedCarrier &&
        String(r["地域"]).trim() === String(region).trim() &&
        String(r["サイズ"] || "").trim() !== ""
    )
    .sort((a, b) => toNumber(a["サイズ"]) - toNumber(b["サイズ"]));

  if (rows.length === 0) return null;

  const sizeNum = toNumber(size);
  const matched = rows.find((r) => sizeNum <= toNumber(r["サイズ"]));

  return matched || rows[rows.length - 1] || null;
}

function calculateFareByCarrier(
  carrier,
  product,
  prefecture,
  carrierRegions,
  carrierRates,
  specialSeinoRates
) {
  const normalizedCarrier = normalizeCarrierName(carrier);
  if (!normalizedCarrier) return null;

  const region = getCarrierRegion(normalizedCarrier, prefecture, carrierRegions);
  if (!region) return null;

  const size = product["基準サイズ"] || product["基準"] || "";
  const weight = getShippingWeight(product);

  let rateRow = null;

  if (normalizedCarrier === "西濃") {
    const table = isSeinoSpecial(product)
      ? specialSeinoRates
      : carrierRates;

    rateRow = findSeinoRate(region, weight, table);
  } else {
    rateRow = findStandardRate(normalizedCarrier, region, size, carrierRates);
  }

  if (!rateRow) return null;

  const basic = toNumber(rateRow["運賃"]);
  const island = toNumber(rateRow["離島加算"]);
  const relay = toNumber(rateRow["中継加算"] || rateRow["中継料"]);

  return {
    運送会社: normalizedCarrier,
    地域: region,
    適用サイズ: normalizedCarrier === "西濃" ? "" : (rateRow["サイズ"] || size),
    適用重量: normalizedCarrier === "西濃" ? toNumber(rateRow["重量"]) : weight,
    基本運賃: basic,
    離島加算: island,
    中継加算: relay,
    合計: basic + island + relay,
  };
}

export function buildFareResults(
  product,
  prefecture,
  carrierRegions,
  carrierRates,
  specialSeinoRates
) {
  const carriers = [
    product["運送便①"],
    product["運送便②"],
    product["運送便③"],
  ]
    .map((c) => normalizeCarrierName(c))
    .filter(Boolean);

  const uniqueCarriers = [...new Set(carriers)];

  return uniqueCarriers
    .map((carrier) =>
      calculateFareByCarrier(
        carrier,
        product,
        prefecture,
        carrierRegions,
        carrierRates,
        specialSeinoRates
      )
    )
    .filter(Boolean)
    .sort((a, b) => a["合計"] - b["合計"]);
}
