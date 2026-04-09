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

function getValue(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return "";
}

function getShippingWeight(product) {
  return Math.max(
    toNumber(getValue(product, ["実重量", "重量"])),
    toNumber(getValue(product, ["m3重量", "m³重量"]))
  );
}

function getCarrierRegion(carrier, prefecture, carrierRegions) {
  const normalizedCarrier = normalizeCarrierName(carrier);

  const row = carrierRegions.find((r) => {
    const rowCarrier = normalizeCarrierName(
      getValue(r, ["運送会社", "carrier"])
    );
    const rowPrefecture = String(
      getValue(r, ["都道府県", "prefecture"])
    ).trim();

    return (
      rowCarrier === normalizedCarrier &&
      rowPrefecture === String(prefecture).trim()
    );
  });

  return row ? String(getValue(row, ["地域", "region"])).trim() : null;
}

function isSeinoSpecial(product) {
  return String(getValue(product, ["西濃別表"]) || "0").trim() === "1";
}

function findSeinoRate(region, weight, rateTable) {
  const rows = rateTable
    .filter((r) => {
      const carrier = normalizeCarrierName(getValue(r, ["運送会社", "carrier"]));
      const rowRegion = String(getValue(r, ["地域", "region", "距離帯"])).trim();
      const rowWeight = getValue(r, ["重量", "重量kg"]);

      return (
        carrier === "西濃" &&
        rowRegion === String(region).trim() &&
        String(rowWeight).trim() !== ""
      );
    })
    .sort((a, b) => {
      const aw = toNumber(getValue(a, ["重量", "重量kg"]));
      const bw = toNumber(getValue(b, ["重量", "重量kg"]));
      return aw - bw;
    });

  if (rows.length === 0) return null;

  const matched = rows.find((r) => {
    const rowWeight = toNumber(getValue(r, ["重量", "重量kg"]));
    return weight <= rowWeight;
  });

  return matched || rows[rows.length - 1] || null;
}

function findStandardRate(carrier, region, size, carrierRates) {
  const normalizedCarrier = normalizeCarrierName(carrier);

  const rows = carrierRates
    .filter((r) => {
      const rowCarrier = normalizeCarrierName(getValue(r, ["運送会社", "carrier"]));
      const rowRegion = String(getValue(r, ["地域", "region"])).trim();
      const rowSize = getValue(r, ["サイズ"]);

      return (
        rowCarrier === normalizedCarrier &&
        rowRegion === String(region).trim() &&
        String(rowSize).trim() !== ""
      );
    })
    .sort((a, b) => {
      const as = toNumber(getValue(a, ["サイズ"]));
      const bs = toNumber(getValue(b, ["サイズ"]));
      return as - bs;
    });

  if (rows.length === 0) return null;

  const sizeNum = toNumber(size);
  const matched = rows.find((r) => sizeNum <= toNumber(getValue(r, ["サイズ"])));

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

  let region = getCarrierRegion(normalizedCarrier, prefecture, carrierRegions);
  if (!region) return null;

  const size = getValue(product, ["基準サイズ", "基準"]);
  const weight = getShippingWeight(product);

  if (normalizedCarrier === "西濃") {
    const regionNum = Number(region);

    if (!Number.isNaN(regionNum) && weight >= 200) {
      region = String(Math.ceil(regionNum / 100) * 100);
    }
  }

  let rateRow = null;

  if (normalizedCarrier === "西濃") {
    const table = isSeinoSpecial(product) ? specialSeinoRates : carrierRates;
    rateRow = findSeinoRate(region, weight, table);
  } else {
    rateRow = findStandardRate(normalizedCarrier, region, size, carrierRates);
  }

  if (!rateRow) return null;

  const basic = toNumber(getValue(rateRow, ["運賃", "price"]));
  const island = toNumber(getValue(rateRow, ["離島加算", "islandSurcharge"]));
  const relay = toNumber(getValue(rateRow, ["中継加算", "中継料", "relaySurcharge"]));

  return {
    運送会社: normalizedCarrier,
    地域: region,
    適用サイズ: normalizedCarrier === "西濃" ? "" : (getValue(rateRow, ["サイズ"]) || size),
    適用重量: normalizedCarrier === "西濃"
      ? toNumber(getValue(rateRow, ["重量", "重量kg"]))
      : weight,
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
    getValue(product, ["運送便①"]),
    getValue(product, ["運送便②"]),
    getValue(product, ["運送便③"]),
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
function isKyushu(prefecture) {
  return [
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
  ].includes(String(prefecture).trim());
}
