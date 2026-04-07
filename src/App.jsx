import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Search, Truck } from "lucide-react";

const defaultProducts = [
  { code: "5145800", name: "移動式木工具収納ケース", standardSize: 220, actualWeight: 17.8, cubicWeight: 70.7, carrier1: "佐川急便", carrier2: "", carrier3: "" },
  { code: "5102010", name: "ものづくり基本道具収納ケース", standardSize: 190, actualWeight: null, cubicWeight: 62.5, carrier1: "佐川急便", carrier2: "", carrier3: "" },
  { code: "5372110", name: "ベルトサンダー TY-200", standardSize: 160, actualWeight: null, cubicWeight: 32.6, carrier1: "佐川急便", carrier2: "ヤマト運輸", carrier3: "西濃運輸" },
  { code: "5372111", name: "ベルトサンダー TY-200専用台", standardSize: 150, actualWeight: null, cubicWeight: 30.3, carrier1: "佐川急便", carrier2: "ヤマト運輸", carrier3: "" },
  { code: "5372130", name: "ベルトサンダー TS1NDX", standardSize: 160, actualWeight: null, cubicWeight: 48.2, carrier1: "佐川急便", carrier2: "", carrier3: "" },
  { code: "5372017", name: "ベルトサンダー BDS-1010", standardSize: 140, actualWeight: null, cubicWeight: 14.5, carrier1: "佐川急便", carrier2: "", carrier3: "" },
];

const prefectureToRegion = {
  熊本県: "南九州", 宮崎県: "南九州", 鹿児島県: "南九州",
  福岡県: "北九州", 佐賀県: "北九州", 長崎県: "北九州", 大分県: "北九州",
  徳島県: "四国", 香川県: "四国", 愛媛県: "四国", 高知県: "四国",
  鳥取県: "中国", 島根県: "中国", 岡山県: "中国", 広島県: "中国", 山口県: "中国",
  滋賀県: "関西", 京都府: "関西", 大阪府: "関西", 兵庫県: "関西", 奈良県: "関西", 和歌山県: "関西",
  富山県: "北陸", 石川県: "北陸", 福井県: "北陸",
  岐阜県: "東海", 静岡県: "東海", 愛知県: "東海", 三重県: "東海",
  新潟県: "信越", 長野県: "信越",
  茨城県: "関東", 栃木県: "関東", 群馬県: "関東", 埼玉県: "関東", 千葉県: "関東", 東京都: "関東", 神奈川県: "関東", 山梨県: "関東",
  宮城県: "南東北", 山形県: "南東北", 福島県: "南東北",
  秋田県: "北東北", 青森県: "北東北", 岩手県: "北東北",
  北海道: "北海道",
};

const baseRateTable = [
  { size: 60, weight: 2, prices: { 南九州: 410, 北九州: 410, 四国: 410, 中国: 410, 関西: 370, 北陸: 410, 東海: 410, 信越: 410, 関東: 410, 南東北: 420, 北東北: 530, 北海道: 1150 } },
  { size: 80, weight: 5, prices: { 南九州: 430, 北九州: 430, 四国: 420, 中国: 420, 関西: 390, 北陸: 420, 東海: 420, 信越: 450, 関東: 460, 南東北: 510, 北東北: 560, 北海道: 1250 } },
  { size: 100, weight: 10, prices: { 南九州: 570, 北九州: 540, 四国: 470, 中国: 490, 関西: 410, 北陸: 470, 東海: 470, 信越: 510, 関東: 590, 南東北: 660, 北東北: 760, 北海道: 1450 } },
  { size: 140, weight: 20, prices: { 南九州: 710, 北九州: 710, 四国: 590, 中国: 590, 関西: 490, 北陸: 560, 東海: 560, 信越: 640, 関東: 730, 南東北: 810, 北東北: 960, 北海道: 1550 } },
  { size: 170, weight: 30, prices: { 南九州: 1310, 北九州: 1130, 四国: 960, 中国: 1000, 関西: 770, 北陸: 960, 東海: 890, 信越: 1070, 関東: 1240, 南東北: 1310, 北東北: 1570, 北海道: 1930 } },
  { size: 180, weight: 50, prices: { 南九州: 1350, 北九州: 1250, 四国: 1040, 中国: 1100, 関西: 820, 北陸: 1040, 東海: 960, 信越: 1170, 関東: 1390, 南東北: 1480, 北東北: 1790, 北海道: 2210 } },
  { size: 200, weight: 60, prices: { 南九州: 1720, 北九州: 1590, 四国: 1310, 中国: 1380, 関西: 1010, 北陸: 1310, 東海: 1200, 信越: 1490, 関東: 1770, 南東北: 1900, 北東北: 2310, 北海道: 2890 } },
  { size: 220, weight: 80, prices: { 南九州: 2170, 北九州: 1930, 四国: 1580, 中国: 1670, 関西: 1210, 北陸: 1580, 東海: 1440, 信越: 1800, 関東: 2150, 南東北: 2330, 北東北: 2840, 北海道: 3560 } },
  { size: 240, weight: 100, prices: { 南九州: 2870, 北九州: 2630, 四国: 2140, 中国: 2260, 関西: 1600, 北陸: 2140, 東海: 1930, 信越: 2460, 関東: 2960, 南東北: 3190, 北東北: 3900, 北海道: 4910 } },
  { size: 260, weight: 180, prices: { 南九州: 3630, 北九州: 3330, 四国: 2680, 中国: 2860, 関西: 1990, 北陸: 2680, 東海: 2440, 信越: 3100, 関東: 3750, 南東北: 4040, 北東北: 4960, 北海道: 6260 } },
];

const defaultCarriers = {
  佐川急便: {
    name: "佐川急便",
    islandSurcharge: 0,
    relaySurcharge: 0,
    rateTable: baseRateTable,
  },
  ヤマト運輸: {
    name: "ヤマト運輸",
    islandSurcharge: 0,
    relaySurcharge: 0,
    rateTable: baseRateTable.map((row) => ({
      ...row,
      prices: Object.fromEntries(Object.entries(row.prices).map(([key, value]) => [key, value + 120])),
    })),
  },
  西濃運輸: {
    name: "西濃運輸",
    islandSurcharge: 0,
    relaySurcharge: 0,
    rateTable: baseRateTable.map((row) => ({
      ...row,
      prices: Object.fromEntries(Object.entries(row.prices).map(([key, value]) => [key, value + 60])),
    })),
  },
};

const allPrefectures = Object.keys(prefectureToRegion);

function normalizeText(value) {
  return String(value ?? "").toLowerCase().replace(/[\s　\-ー―−]/g, "").trim();
}

function parseNumber(value) {
  if (value === "" || value == null) return null;
  const num = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : null;
}

function formatYen(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return `¥${Number(value).toLocaleString("ja-JP")}`;
}

function getApplicableSize(standardSize, rateTable) {
  return rateTable.find((row) => Number(row.size) >= Number(standardSize)) || null;
}

function parseCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((line) => line.trim() !== "");
  if (!lines.length) return [];

  const splitLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map((v) => v.trim());
  };

  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function getProductCarrierNames(product) {
  const candidates = [product?.carrier1, product?.carrier2, product?.carrier3]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

function getFreightDetail(product, prefecture, carrierName, carriers) {
  if (!product || !prefecture || !carrierName) return null;
  const carrier = carriers[carrierName];
  if (!carrier) return null;
  const region = prefectureToRegion[prefecture];
  if (!region) return null;
  const applicableRow = getApplicableSize(product.standardSize, carrier.rateTable);
  if (!applicableRow) return null;
  const basePrice = parseNumber(applicableRow.prices[region]);
  if (basePrice == null) return null;
  const islandFee = parseNumber(carrier.islandSurcharge) || 0;
  const relayFee = parseNumber(carrier.relaySurcharge) || 0;

  return {
    carrierName,
    region,
    applicableRow,
    basePrice,
    islandFee,
    relayFee,
    total: basePrice + islandFee + relayFee,
  };
}

function mapProductRows(productRows) {
  return productRows
    .map((row) => ({
      code: String(row.code || row.品番 || "").trim(),
      name: String(row.name || row.品名 || "").trim(),
      standardSize: parseNumber(row.standardSize || row.基準サイズ || row.基準),
      actualWeight: parseNumber(row.actualWeight || row.実重量),
      cubicWeight: parseNumber(row.cubicWeight || row["m3重量"] || row["㎥重量"]),
      carrier1: String(row.carrier1 || row["運送便①"] || row["運送便1"] || "").trim(),
      carrier2: String(row.carrier2 || row["運送便②"] || row["運送便2"] || "").trim(),
      carrier3: String(row.carrier3 || row["運送便③"] || row["運送便3"] || "").trim(),
    }))
    .filter((row) => row.code && row.name && row.standardSize != null);
}

function mapCarrierRows(carrierRows) {
  const nextCarriers = {};

  carrierRows.forEach((row) => {
    const name = String(row.carrier || row.運送会社 || "").trim();
    const size = parseNumber(row.size || row.サイズ);
    const weight = parseNumber(row.weight || row.重量);
    const region = String(row.region || row.地域 || "").trim();
    const price = parseNumber(row.price || row.運賃);
    const island = parseNumber(row.islandSurcharge || row.離島加算) || 0;
    const relay = parseNumber(row.relaySurcharge || row.中継料) || 0;

    if (!name || size == null || !region || price == null) return;

    if (!nextCarriers[name]) {
      nextCarriers[name] = {
        name,
        islandSurcharge: island,
        relaySurcharge: relay,
        rateTable: [],
      };
    }

    let rowEntry = nextCarriers[name].rateTable.find((item) => Number(item.size) === Number(size));
    if (!rowEntry) {
      rowEntry = {
        size,
        weight: weight == null ? null : weight,
        prices: {},
      };
      nextCarriers[name].rateTable.push(rowEntry);
    }

    rowEntry.prices[region] = price;
  });

  Object.values(nextCarriers).forEach((carrier) => {
    carrier.rateTable.sort((a, b) => Number(a.size) - Number(b.size));
  });

  return nextCarriers;
}

function FreightResultCard({ matchedProduct, prefecture, freightDetails }) {
  if (!matchedProduct || !prefecture || !freightDetails.length) {
    return <div className="empty-box">品番か商品名を入れて、都道府県を選ぶとここに運賃が出ます。</div>;
  }

  const sorted = [...freightDetails].sort((a, b) => a.total - b.total);
  const cheapest = sorted[0];
  const labels = ["①", "②", "③"];

  return (
    <div className="result-stack compact-result-stack">
      <div className="hero-result compact-hero-result">
        <div className="hero-label">最安候補</div>
        <div className="hero-price">{formatYen(cheapest.total)}</div>
        <div className="hero-sub">
          {cheapest.carrierName} / {prefecture} / {cheapest.region} / サイズ {cheapest.applicableRow.size}
        </div>
      </div>

      <div className="compare-wrap compact-compare-wrap">
        <div className="compare-title">候補便 比較表</div>
        <div className="compare-table">
          <div className="compare-head compact-compare-head">
            <div>便</div>
            <div>運送会社</div>
            <div>基本運賃</div>
            <div>離島加算</div>
            <div>中継料</div>
            <div>合計運賃</div>
          </div>

          {freightDetails.map((detail, index) => {
            const isCheapest = detail.total === cheapest.total;
            return (
              <div key={`${detail.carrierName}-${index}`} className={`compare-row compact-compare-row ${isCheapest ? "is-cheapest" : ""}`}>
                <div>{labels[index] || `${index + 1}`}</div>
                <div>
                  {detail.carrierName}
                  {isCheapest ? <span className="min-badge">最安</span> : null}
                </div>
                <div>{formatYen(detail.basePrice)}</div>
                <div>{formatYen(detail.islandFee)}</div>
                <div>{formatYen(detail.relayFee)}</div>
                <div className="total-cell">{formatYen(detail.total)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="note-box compact-note-box">
        <div className="note-title"><AlertCircle size={16} /> 補足</div>
        <div>運送便①のみなら固定便として1候補だけ表示します。</div>
        <div>運送便②・③がある場合は、候補便を比較表でまとめて表示します。</div>
      </div>
    </div>
  );
}

export default function App() {
  const candidateListRef = useRef(null);

  const [products, setProducts] = useState(defaultProducts);
  const [carriers, setCarriers] = useState(defaultCarriers);
  const [searchText, setSearchText] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [message, setMessage] = useState("");

  const loadInitialCsvFiles = async () => {
    try {
      const [productResponse, carrierResponse] = await Promise.all([
        fetch("/products.csv", { cache: "no-store" }),
        fetch("/carriers.csv", { cache: "no-store" }),
      ]);

      if (!productResponse.ok || !carrierResponse.ok) {
        throw new Error("CSVの取得に失敗しました。");
      }

      const productText = await productResponse.text();
      const carrierText = await carrierResponse.text();

      const productRows = parseCsv(productText);
      const mappedProducts = mapProductRows(productRows);

      const carrierRows = parseCsv(carrierText);
      const nextCarriers = mapCarrierRows(carrierRows);

      if (mappedProducts.length) {
        setProducts(mappedProducts);
      }

      if (Object.keys(nextCarriers).length) {
        setCarriers(nextCarriers);
      }

      setMessage("GitHub上のCSVを自動読み込みしました。");
    } catch {
      setMessage("初期CSVの自動読み込みに失敗しました。");
    }
  };

  useEffect(() => {
    loadInitialCsvFiles();
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = normalizeText(searchText);
    if (!keyword) return products;

    const matched = products.filter((product) => {
      const codeText = normalizeText(product.code);
      const nameText = normalizeText(product.name);
      const combined = `${codeText}${nameText}`;
      return codeText.includes(keyword) || nameText.includes(keyword) || combined.includes(keyword);
    });

    return matched.sort((a, b) => {
      const aName = normalizeText(a.name);
      const bName = normalizeText(b.name);
      const aCode = normalizeText(a.code);
      const bCode = normalizeText(b.code);

      const aScore =
        (aCode === keyword ? 100 : 0) +
        (aName === keyword ? 90 : 0) +
        (aName.startsWith(keyword) ? 50 : 0) +
        (aCode.startsWith(keyword) ? 40 : 0) +
        (aName.includes(keyword) ? 20 : 0) +
        (aCode.includes(keyword) ? 10 : 0);

      const bScore =
        (bCode === keyword ? 100 : 0) +
        (bName === keyword ? 90 : 0) +
        (bName.startsWith(keyword) ? 50 : 0) +
        (bCode.startsWith(keyword) ? 40 : 0) +
        (bName.includes(keyword) ? 20 : 0) +
        (bCode.includes(keyword) ? 10 : 0);

      return bScore - aScore;
    });
  }, [products, searchText]);

  useEffect(() => {
    if (candidateListRef.current) {
      candidateListRef.current.scrollTop = 0;
    }
  }, [searchText, products]);

  const matchedProduct = useMemo(() => {
    if (!searchText.trim()) return null;
    const exact = products.find((product) => product.code === searchText.trim());
    return exact || filteredProducts[0] || null;
  }, [products, searchText, filteredProducts]);

  const freightDetails = useMemo(() => {
    if (!matchedProduct || !prefecture) return [];
    const carrierNames = getProductCarrierNames(matchedProduct);
    if (!carrierNames.length) return [];
    return carrierNames
      .map((carrierName) => getFreightDetail(matchedProduct, prefecture, carrierName, carriers))
      .filter(Boolean);
  }, [matchedProduct, prefecture, carriers]);

  return (
    <>
      <style>{`
        :root { font-family: Inter, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif; color: #0f172a; background: #f8fafc; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; }
        button, input, textarea, select { font: inherit; }
        .page { max-width: 1360px; margin: 0 auto; padding: 16px 20px 20px; }
        .title { font-size: 26px; font-weight: 800; margin: 0 0 6px; }
        .subtitle { margin: 0 0 14px; color: #475569; font-size: 13px; }
        .message { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; font-size: 13px; }
        .grid-top { display: grid; gap: 14px; grid-template-columns: 1fr 0.95fr; }
        .card { background: #fff; border: 1px solid #dbe4ee; border-radius: 18px; box-shadow: 0 2px 10px rgba(15,23,42,0.04); }
        .card-head { padding: 16px 18px 0; }
        .card-title { display: flex; gap: 8px; align-items: center; font-size: 16px; font-weight: 800; }
        .card-body { padding: 14px 16px 16px; }
        .field { margin-bottom: 10px; }
        .label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 700; }
        .field-head-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
        .field-head-row .label { margin-bottom: 0; }
        .clear-btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 10px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .clear-btn:hover { background: #f8fafc; }
        .hint { margin-top: 6px; font-size: 11px; color: #64748b; }
        .input, .select { width: 100%; border: 1px solid #cbd5e1; background: #fff; border-radius: 12px; padding: 10px 12px; outline: none; height: 44px; }
        .two-col { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .table-wrap { border: 1px solid #dbe4ee; border-radius: 16px; overflow: hidden; }
        .table-head, .table-row { display: grid; grid-template-columns: 110px 1.5fr 80px 80px 90px; gap: 0; align-items: start; }
        .table-head { background: #f1f5f9; font-size: 12px; font-weight: 800; }
        .table-head > div, .table-row > div { padding: 10px 12px; border-top: 1px solid #e2e8f0; }
        .table-head > div { border-top: 0; }
        .candidate-list { max-height: 220px; overflow: auto; }
        .table-row { width: 100%; text-align: left; background: #fff; border: 0; cursor: pointer; font-size: 12px; }
        .table-row:hover { background: #f8fafc; }
        .empty-box { min-height: 150px; display: flex; align-items: center; justify-content: center; border: 1px dashed #cbd5e1; border-radius: 16px; color: #64748b; text-align: center; padding: 18px; font-size: 13px; }
        .result-stack { display: grid; gap: 10px; }
        .hero-result { background: #0f172a; color: #fff; border-radius: 16px; padding: 14px 16px; }
        .hero-label { color: #cbd5e1; font-size: 12px; }
        .hero-price { margin-top: 6px; font-size: 32px; font-weight: 800; line-height: 1.1; }
        .hero-sub { margin-top: 6px; color: #cbd5e1; font-size: 12px; }
        .compare-wrap { border: 1px solid #dbe4ee; border-radius: 14px; overflow: hidden; background: #fff; }
        .compare-title { padding: 10px 12px; font-size: 14px; font-weight: 800; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .compare-table { overflow: auto; }
        .compare-head, .compare-row { display: grid; grid-template-columns: 60px 1.2fr 100px 90px 90px 100px; align-items: center; }
        .compare-head { background: #f1f5f9; font-weight: 800; }
        .compare-head > div, .compare-row > div { padding: 8px 10px; border-top: 1px solid #e2e8f0; font-size: 12px; }
        .compare-head > div { border-top: 0; }
        .compare-row.is-cheapest { background: #ecfdf5; }
        .min-badge { display: inline-block; margin-left: 6px; padding: 3px 7px; border-radius: 999px; background: #10b981; color: #fff; font-size: 10px; font-weight: 700; vertical-align: middle; }
        .total-cell { font-weight: 800; }
        .note-box { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 14px; padding: 10px 12px; display: grid; gap: 4px; font-size: 12px; }
        .note-title { display: flex; align-items: center; gap: 8px; font-weight: 800; }
        @media (max-width: 1100px) { .grid-top { grid-template-columns: 1fr; } }
        @media (max-width: 820px) {
          .page { padding: 14px; }
          .title { font-size: 24px; }
          .compare-head, .compare-row { grid-template-columns: 60px 150px 90px 80px 80px 90px; }
        }
      `}</style>

      <div className="page">
        <h1 className="title">品番・品名から運賃を調べるアプリ</h1>
        <p className="subtitle">品番の完全一致だけでなく、品名や品番の部分一致でも検索できます。商品CSVの運送便①〜③を見て候補運賃を表示します。</p>
        {message ? <div className="message">{message}</div> : null}

        <div className="grid-top">
          <div className="card">
            <div className="card-head"><div className="card-title"><Search size={20} /> 検索条件</div></div>
            <div className="card-body">
              <div className="field">
                <div className="field-head-row">
                  <label className="label">品番または品名</label>
                  <button type="button" className="clear-btn" onClick={() => setSearchText("")}>クリア</button>
                </div>
                <input className="input" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="例: 5145800 / バンドソー / TY-200" />
                <div className="hint">部分一致のあいまい検索に対応しています。</div>
              </div>

              <div className="two-col">
                <div className="field">
                  <label className="label">送り先の都道府県</label>
                  <select className="select" value={prefecture} onChange={(e) => setPrefecture(e.target.value)}>
                    <option value="">都道府県を選択</option>
                    {allPrefectures.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>

              {searchText.trim() && !matchedProduct ? <div className="note-box">一致する商品が見つかっていません。</div> : null}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">検索候補一覧</div></div>
            <div className="card-body">
              <div className="table-wrap">
                <div className="table-head">
                  <div>品番</div>
                  <div>品名</div>
                  <div>基準</div>
                  <div>実重量</div>
                  <div>m³重量</div>
                </div>
                <div ref={candidateListRef} className="candidate-list">
                  {filteredProducts.map((product) => (
                    <button key={`${product.code}-${product.name}`} type="button" className="table-row" onClick={() => setSearchText(product.code)}>
                      <div><strong>{product.code}</strong></div>
                      <div>{product.name}</div>
                      <div>{product.standardSize}</div>
                      <div>{product.actualWeight ?? "-"}</div>
                      <div>{product.cubicWeight ?? "-"}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><div className="card-title"><Truck size={20} /> 運賃結果</div></div>
          <div className="card-body">
            <FreightResultCard matchedProduct={matchedProduct} prefecture={prefecture} freightDetails={freightDetails} />
          </div>
        </div>
      </div>
    </>
  );
}
