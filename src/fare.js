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
  if (value.includes("久留米")) return "久留米";

  return value;
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

function resolveCarrierForArea(carrier, prefecture) {
  const normalized = normalizeCarrierName(carrier);

  // 九州では西濃枠を久留米に差し替え
  if (isKyushu(prefecture) && normalized === "西濃") {
    return "久留米";
  }

  return normalized;
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

function normalizeWeightCarrierRegion(region) {
  const regionNum = Number(region);
  if (Number.isNaN(regionNum)) return String(region).trim();

  // 450 -> 500
  return String(Math.ceil(regionNum / 100) * 100);
}

function findWeightRate(carrier, region, weight, rateTable) {
  const rows = rateTable
    .filter((r) => {
      const rowCarrier = normalizeCarrierName(getValue(r, ["運送会社", "carrier"]));
      const rowRegion = String(getValue(r, ["地域", "region", "距離帯"])).trim();
      const rowWeight = getValue(r, ["重量", "重量kg"]);

      return (
        rowCarrier === carrier &&
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
  const rows = carrierRates
    .filter((r) => {
      const rowCarrier = normalizeCarrierName(getValue(r, ["運送会社", "carrier"]));
      const rowRegion = String(getValue(r, ["地域", "region"])).trim();
      const rowSize = getValue(r, ["サイズ"]);

      return (
        rowCarrier === carrier &&
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
  candidateSource,
  product,
  prefecture,
  carrierRegions,
  carrierRates,
  specialSeinoRates
) {
  const originalCarrier = normalizeCarrierName(carrier);
  const resolvedCarrier = resolveCarrierForArea(originalCarrier, prefecture);

  if (!resolvedCarrier) return null;

  let region = null;

  if (resolvedCarrier === "西濃" || resolvedCarrier === "久留米") {
    region = getCarrierRegion("西濃", prefecture, carrierRegions);
  } else {
    region = getCarrierRegion(resolvedCarrier, prefecture, carrierRegions);
  }

  if (!region) return null;

  const size = getValue(product, ["基準サイズ", "基準"]);
  const weight = getShippingWeight(product);

  let rateRow = null;

  if (resolvedCarrier === "西濃" || resolvedCarrier === "久留米") {
    region = normalizeWeightCarrierRegion(region);

    const table =
      resolvedCarrier === "西濃" && isSeinoSpecial(product)
        ? specialSeinoRates
        : carrierRates;

    rateRow = findWeightRate(resolvedCarrier, region, weight, table);
  } else {
    rateRow = findStandardRate(resolvedCarrier, region, size, carrierRates);
  }

  if (!rateRow) return null;

  const basic = toNumber(getValue(rateRow, ["運賃", "price"]));
  const island = toNumber(getValue(rateRow, ["離島加算", "islandSurcharge"]));
  const relay = toNumber(getValue(rateRow, ["中継加算", "中継料", "relaySurcharge"]));

  return {
    候補元: candidateSource,
    運送会社: resolvedCarrier,
    元運送会社: originalCarrier,
    地域: region,
    適用サイズ:
      resolvedCarrier === "西濃" || resolvedCarrier === "久留米"
        ? ""
        : (getValue(rateRow, ["サイズ"]) || size),
    適用重量:
      resolvedCarrier === "西濃" || resolvedCarrier === "久留米"
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
  const candidates = [
    { source: "運送便①", carrier: getValue(product, ["運送便①"]) },
    { source: "運送便②", carrier: getValue(product, ["運送便②"]) },
    { source: "運送便③", carrier: getValue(product, ["運送便③"]) },
  ]
    .map((item) => ({
      source: item.source,
      carrier: normalizeCarrierName(item.carrier),
    }))
    .filter((item) => item.carrier);

  const deduped = [];
  const seen = new Set();

  for (const item of candidates) {
    const resolvedCarrier = resolveCarrierForArea(item.carrier, prefecture);
    const key = `${resolvedCarrier}-${item.source}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push({
        source: item.source,
        carrier: item.carrier,
      });
    }
  }

  return deduped
    .map((item) =>
      calculateFareByCarrier(
        item.carrier,
        item.source,
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
