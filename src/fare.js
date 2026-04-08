function toNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function getShippingWeight(product) {
  return Math.max(
    toNumber(product["実重量"]),
    toNumber(product["m3重量"])
  );
}

function getCarrierRegion(carrier, prefecture, carrierRegions) {
  const row = carrierRegions.find(
    (r) => r["運送会社"] === carrier && r["都道府県"] === prefecture
  );
  return row ? String(row["地域"]) : null;
}

function isSeinoSpecial(product) {
  return product["西濃別表"] === "1";
}

function findSeinoRate(region, weight, rateTable) {
  const rows = rateTable
    .filter(
      (r) =>
        r["運送会社"] === "西濃" &&
        String(r["地域"]) === String(region) &&
        r["重量"] !== ""
    )
    .sort((a, b) => toNumber(a["重量"]) - toNumber(b["重量"]));

  if (rows.length === 0) return null;

  const matched = rows.find((r) => weight <= toNumber(r["重量"]));
  return matched || rows[rows.length - 1] || null;
}

function findStandardRate(carrier, region, size, carrierRates) {
  return (
    carrierRates.find(
      (r) =>
        r["運送会社"] === carrier &&
        String(r["地域"]) === String(region) &&
        String(r["サイズ"]) === String(size)
    ) || null
  );
}

function calculateFareByCarrier(
  carrier,
  product,
  prefecture,
  carrierRegions,
  carrierRates,
  specialSeinoRates
) {
  const region = getCarrierRegion(carrier, prefecture, carrierRegions);
  if (!region) return null;

  const size = product["基準サイズ"];
  const weight = getShippingWeight(product);

  let rateRow = null;

  if (carrier === "西濃") {
    const table = isSeinoSpecial(product)
      ? specialSeinoRates
      : carrierRates;

    rateRow = findSeinoRate(region, weight, table);
  } else {
    rateRow = findStandardRate(carrier, region, size, carrierRates);
  }

  if (!rateRow) return null;

  const basic = toNumber(rateRow["運賃"]);
  const island = toNumber(rateRow["離島加算"]);
  const relay = toNumber(rateRow["中継加算"]);

  return {
    運送会社: carrier,
    地域: region,
    適用サイズ: carrier === "西濃" ? "" : size,
    適用重量: carrier === "西濃" ? toNumber(rateRow["重量"]) : weight,
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
  ].filter(Boolean);

  return carriers
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
