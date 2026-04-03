import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Package, Search, Truck, Upload } from "lucide-react";

const defaultProducts = [
  { code: "5145800", name: "移動式木工具収納ケース", standardSize: 220, actualWeight: 17.8, cubicWeight: 71 },
  { code: "5102010", name: "ものづくり基本道具収納ケース", standardSize: 190, actualWeight: null, cubicWeight: 63 },
  { code: "5372110", name: "ベルトサンダー TY-200", standardSize: 160, actualWeight: null, cubicWeight: 33 },
  { code: "5372111", name: "ベルトサンダー TY-200専用台", standardSize: 150, actualWeight: null, cubicWeight: 30 },
  { code: "5372130", name: "ベルトサンダー TS1NDX", standardSize: 160, actualWeight: null, cubicWeight: 48 },
  { code: "5372017", name: "ベルトサンダー BDS-1010", standardSize: 140, actualWeight: null, cubicWeight: 14 },
  { code: "5166500", name: "バンドソー BT-500", standardSize: 240, actualWeight: null, cubicWeight: 142 },
  { code: "5155408", name: "卓上切断機 TS225", standardSize: 140, actualWeight: 12, cubicWeight: 17 },
  { code: "5155780", name: "バンドソー TBS-80", standardSize: 160, actualWeight: 13, cubicWeight: 28 },
  { code: "5367905", name: "ボール盤床上台 SB-2", standardSize: 170, actualWeight: null, cubicWeight: 44 },
  { code: "5155811", name: "自動鉋盤 AP-10N", standardSize: 120, actualWeight: 26, cubicWeight: 14 },
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
  佐川急便: { name: "佐川急便", islandSurcharge: 0, relaySurcharge: 0, rateTable: baseRateTable },
  ヤマト運輸: {
    name: "ヤマト運輸",
    islandSurcharge: 0,
    relaySurcharge: 0,
    rateTable: baseRateTable.map((row) => ({
      ...row,
      prices: Object.fromEntries(Object.entries(row.prices).map(([k, v]) => [k, v + 120])),
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

function FreightResultCard({ matchedProduct, prefecture, carrier, priceDetail }) {
  if (!matchedProduct || !prefecture || !carrier || !priceDetail) {
    return <div className="empty-box">品番か商品名を入れて、都道府県と運送会社を選ぶとここに運賃が出ます。</div>;
  }
  return (
    <div className="result-stack">
      <div className="hero-result">
        <div className="hero-label">合計運賃</div>
        <div className="hero-price">{formatYen(priceDetail.total)}</div>
        <div className="hero-sub">{prefecture} / {priceDetail.region} / {carrier.name} / サイズ {priceDetail.applicableRow.size}</div>
      </div>
      <div className="mini-grid">
        <div className="mini-card"><div className="mini-label">基本運賃</div><div className="mini-value">{formatYen(priceDetail.basePrice)}</div></div>
        <div className="mini-card"><div className="mini-label">離島加算</div><div className="mini-value">{formatYen(priceDetail.islandFee)}</div></div>
        <div className="mini-card"><div className="mini-label">中継料</div><div className="mini-value">{formatYen(priceDetail.relayFee)}</div></div>
      </div>
      <div className="note-box">
        <div className="note-title"><AlertCircle size={16} /> 補足</div>
        <div>CSVで商品マスタも運賃表も差し替えできます。</div>
        <div>離島加算や中継料は運送会社ごとの設定値を自動加算します。</div>
      </div>
    </div>
  );
}

export default function App() {
  const productFileInputRef = useRef(null);
  const carrierFileInputRef = useRef(null);
  const candidateListRef = useRef(null);
  const [products, setProducts] = useState(defaultProducts);
  const [carriers, setCarriers] = useState(defaultCarriers);
  const [searchText, setSearchText] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [carrierName, setCarrierName] = useState(Object.keys(defaultCarriers)[0]);
  const [productCsvText, setProductCsvText] = useState("code,name,standardSize,actualWeight,cubicWeight\n5145800,移動式木工具収納ケース,220,17.8,71\n5102010,ものづくり基本道具収納ケース,190,,63");
  const [carrierCsvText, setCarrierCsvText] = useState("carrier,size,weight,region,price,islandSurcharge,relaySurcharge\n佐川急便,60,2,南九州,410,0,0\n佐川急便,60,2,北九州,410,0,0\nヤマト運輸,60,2,南九州,530,0,0\nヤマト運輸,60,2,北九州,530,0,0");
  const [message, setMessage] = useState("");
  const currentCarrier = carriers[carrierName] || null;

  const readFileAsText = (file, onLoad) => {
    const reader = new FileReader();
    reader.onload = () => onLoad(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setMessage("CSVファイルの読み込みでエラーが出ました。");
    reader.readAsText(file, "utf-8");
  };

  const handleProductFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    readFileAsText(file, (text) => {
      setProductCsvText(text);
      setMessage(`商品マスタCSVを選択しました: ${file.name}`);
    });
    event.target.value = "";
  };

  const handleCarrierFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    readFileAsText(file, (text) => {
      setCarrierCsvText(text);
      setMessage(`運賃表CSVを選択しました: ${file.name}`);
    });
    event.target.value = "";
  };

  const filteredProducts = useMemo(() => {
    const keyword = normalizeText(searchText);
    if (!keyword) return products;
    const matched = products.filter((p) => {
      const codeText = normalizeText(p.code);
      const nameText = normalizeText(p.name);
      const combined = `${codeText}${nameText}`;
      return codeText.includes(keyword) || nameText.includes(keyword) || combined.includes(keyword);
    });
    return matched.sort((a, b) => {
      const aName = normalizeText(a.name), bName = normalizeText(b.name);
      const aCode = normalizeText(a.code), bCode = normalizeText(b.code);
      const aScore = (aCode === keyword ? 100 : 0) + (aName === keyword ? 90 : 0) + (aName.startsWith(keyword) ? 50 : 0) + (aCode.startsWith(keyword) ? 40 : 0) + (aName.includes(keyword) ? 20 : 0) + (aCode.includes(keyword) ? 10 : 0);
      const bScore = (bCode === keyword ? 100 : 0) + (bName === keyword ? 90 : 0) + (bName.startsWith(keyword) ? 50 : 0) + (bCode.startsWith(keyword) ? 40 : 0) + (bName.includes(keyword) ? 20 : 0) + (bCode.includes(keyword) ? 10 : 0);
      return bScore - aScore;
    });
  }, [products, searchText]);

  useEffect(() => {
    if (candidateListRef.current) candidateListRef.current.scrollTop = 0;
  }, [searchText, products]);

  const matchedProduct = useMemo(() => {
    if (!searchText.trim()) return null;
    const exact = products.find((p) => p.code === searchText.trim());
    return exact || filteredProducts[0] || null;
  }, [products, searchText, filteredProducts]);

  const priceDetail = useMemo(() => {
    if (!matchedProduct || !prefecture || !currentCarrier) return null;
    const region = prefectureToRegion[prefecture];
    if (!region) return null;
    const applicableRow = getApplicableSize(matchedProduct.standardSize, currentCarrier.rateTable);
    if (!applicableRow) return null;
    const basePrice = parseNumber(applicableRow.prices[region]);
    if (basePrice == null) return null;
    const islandFee = parseNumber(currentCarrier.islandSurcharge) || 0;
    const relayFee = parseNumber(currentCarrier.relaySurcharge) || 0;
    return { region, applicableRow, basePrice, islandFee, relayFee, total: basePrice + islandFee + relayFee };
  }, [matchedProduct, prefecture, currentCarrier]);

  const importProductsFromCsv = () => {
    try {
      const rows = parseCsv(productCsvText);
      const mapped = rows.map((row) => ({
        code: String(row.code || row.品番 || "").trim(),
        name: String(row.name || row.品名 || "").trim(),
        standardSize: parseNumber(row.standardSize || row.基準サイズ || row.基準),
        actualWeight: parseNumber(row.actualWeight || row.実重量),
        cubicWeight: parseNumber(row.cubicWeight || row["m3重量"] || row["㎥重量"]),
      })).filter((row) => row.code && row.name && row.standardSize != null);
      if (!mapped.length) {
        setMessage("商品CSVの読み込みに失敗しました。ヘッダー名を確認してください。");
        return;
      }
      setProducts(mapped);
      setMessage(`商品マスタを ${mapped.length} 件読み込みました。`);
    } catch {
      setMessage("商品CSVの読み込みでエラーが出ました。");
    }
  };

  const importCarriersFromCsv = () => {
    try {
      const rows = parseCsv(carrierCsvText);
      const nextCarriers = {};
      rows.forEach((row) => {
        const name = String(row.carrier || row.運送会社 || "").trim();
        const size = parseNumber(row.size || row.サイズ);
        const weight = parseNumber(row.weight || row.重量);
        const region = String(row.region || row.地域 || "").trim();
        const price = parseNumber(row.price || row.運賃);
        const island = parseNumber(row.islandSurcharge || row.離島加算) || 0;
        const relay = parseNumber(row.relaySurcharge || row.中継料) || 0;
        if (!name || size == null || !region || price == null) return;
        if (!nextCarriers[name]) nextCarriers[name] = { name, islandSurcharge: island, relaySurcharge: relay, rateTable: [] };
        let rowEntry = nextCarriers[name].rateTable.find((item) => Number(item.size) === Number(size));
        if (!rowEntry) {
          rowEntry = { size, weight: weight == null ? null : weight, prices: {} };
          nextCarriers[name].rateTable.push(rowEntry);
        }
        rowEntry.prices[region] = price;
      });
      Object.values(nextCarriers).forEach((carrier) => carrier.rateTable.sort((a, b) => Number(a.size) - Number(b.size)));
      if (!Object.keys(nextCarriers).length) {
        setMessage("運賃CSVの読み込みに失敗しました。ヘッダー名を確認してください。");
        return;
      }
      setCarriers(nextCarriers);
      setCarrierName(Object.keys(nextCarriers)[0]);
      setMessage(`運送会社マスタを ${Object.keys(nextCarriers).length} 社読み込みました。`);
    } catch {
      setMessage("運賃CSVの読み込みでエラーが出ました。");
    }
  };

  return (
    <>
      <style>{`
        :root { font-family: Inter, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif; color: #0f172a; background: #f8fafc; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; }
        button, input, textarea, select { font: inherit; }
        .page { max-width: 1400px; margin: 0 auto; padding: 28px; }
        .title { font-size: 42px; font-weight: 800; margin: 0 0 10px; }
        .subtitle { margin: 0 0 24px; color: #475569; font-size: 18px; }
        .message { background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 14px 16px; margin-bottom: 20px; }
        .grid-top { display: grid; gap: 24px; grid-template-columns: 1.05fr 0.95fr; }
        .card { background: #fff; border: 1px solid #dbe4ee; border-radius: 24px; box-shadow: 0 4px 18px rgba(15,23,42,0.05); }
        .card-head { padding: 24px 28px 0; }
        .card-title { display: flex; gap: 10px; align-items: center; font-size: 20px; font-weight: 800; }
        .card-body { padding: 24px 28px 28px; }
        .field { margin-bottom: 18px; }
        .label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 700; }
        .hint { margin-top: 8px; font-size: 12px; color: #64748b; }
        .input, .select, .textarea { width: 100%; border: 1px solid #cbd5e1; background: #fff; border-radius: 16px; padding: 14px 16px; outline: none; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .candidate-hero { border: 1px solid #dbe4ee; border-radius: 20px; padding: 18px; background: #fcfdff; }
        .muted { color: #64748b; }
        .hero-topline { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .badge { background: #eef2f7; color: #0f172a; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .candidate-name { font-size: 20px; font-weight: 800; margin: 8px 0 6px; }
        .mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .mini-card { background: #f8fafc; border-radius: 18px; padding: 14px; }
        .mini-label { color: #64748b; font-size: 13px; margin-bottom: 6px; }
        .mini-value { font-size: 20px; font-weight: 800; }
        .table-wrap { border: 1px solid #dbe4ee; border-radius: 20px; overflow: hidden; }
        .table-head, .table-row { display: grid; grid-template-columns: 130px 1.5fr 90px 90px 110px; gap: 0; align-items: start; }
        .table-head { background: #f1f5f9; font-size: 14px; font-weight: 800; }
        .table-head > div, .table-row > div { padding: 14px 18px; border-top: 1px solid #e2e8f0; }
        .table-head > div { border-top: 0; }
        .candidate-list { max-height: 420px; overflow: auto; }
        .table-row { width: 100%; text-align: left; background: #fff; border: 0; cursor: pointer; }
        .table-row:hover { background: #f8fafc; }
        .empty-box { min-height: 260px; display: flex; align-items: center; justify-content: center; border: 1px dashed #cbd5e1; border-radius: 20px; color: #64748b; text-align: center; padding: 24px; }
        .result-stack { display: grid; gap: 16px; }
        .hero-result { background: #0f172a; color: #fff; border-radius: 20px; padding: 22px; }
        .hero-label { color: #cbd5e1; font-size: 14px; }
        .hero-price { margin-top: 8px; font-size: 44px; font-weight: 800; }
        .hero-sub { margin-top: 8px; color: #cbd5e1; font-size: 14px; }
        .note-box { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 18px; padding: 16px; display: grid; gap: 6px; }
        .note-title { display: flex; align-items: center; gap: 8px; font-weight: 800; }
        .csv-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 22px; }
        .textarea { min-height: 240px; resize: vertical; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .btn { border: 0; border-radius: 14px; padding: 12px 16px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-weight: 700; }
        .btn-primary { background: #0f172a; color: #fff; }
        .btn-secondary { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
        .header-box { border: 1px solid #dbe4ee; background: #f8fafc; border-radius: 20px; padding: 18px; color: #334155; line-height: 1.8; }
        .header-box-title { display: flex; gap: 8px; align-items: center; font-weight: 800; margin-bottom: 10px; }
        @media (max-width: 1100px) { .grid-top, .csv-grid { grid-template-columns: 1fr; } }
        @media (max-width: 820px) {
          .page { padding: 16px; }
          .title { font-size: 30px; }
          .two-col, .mini-grid { grid-template-columns: 1fr; }
          .table-head, .table-row { grid-template-columns: 110px 1.2fr 80px 80px 90px; font-size: 13px; }
        }
      `}</style>

      <div className="page">
        <h1 className="title">品番・品名から運賃を調べるアプリ</h1>
        <p className="subtitle">品番の完全一致だけでなく、品名や品番の部分一致でも検索できます。運送会社ごとに運賃表を切り替え可能です。</p>
        {message ? <div className="message">{message}</div> : null}

        <div className="grid-top">
          <div className="card">
            <div className="card-head"><div className="card-title"><Search size={22} /> 検索条件</div></div>
            <div className="card-body">
              <div className="field">
                <label className="label">品番または品名</label>
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
                <div className="field">
                  <label className="label">運送会社</label>
                  <select className="select" value={carrierName} onChange={(e) => setCarrierName(e.target.value)}>
                    {Object.keys(carriers).map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>
              {matchedProduct ? (
                <div className="candidate-hero">
                  <div className="hero-topline">
                    <div>
                      <div className="muted">候補先頭</div>
                      <div className="candidate-name">{matchedProduct.name}</div>
                      <div className="muted">品番: {matchedProduct.code}</div>
                    </div>
                    <div className="badge">基準 {matchedProduct.standardSize}</div>
                  </div>
                  <div className="mini-grid" style={{ marginTop: 16 }}>
                    <div className="mini-card"><div className="mini-label">実重量</div><div className="mini-value">{matchedProduct.actualWeight ?? "-"}</div></div>
                    <div className="mini-card"><div className="mini-label">m³重量</div><div className="mini-value">{matchedProduct.cubicWeight ?? "-"}</div></div>
                    <div className="mini-card"><div className="mini-label">候補件数</div><div className="mini-value">{filteredProducts.length}</div></div>
                  </div>
                </div>
              ) : searchText.trim() ? <div className="note-box">一致する商品が見つかっていません。</div> : null}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">検索候補一覧</div></div>
            <div className="card-body">
              <div className="table-wrap">
                <div className="table-head">
                  <div>品番</div><div>品名</div><div>基準</div><div>実重量</div><div>m³重量</div>
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

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-head"><div className="card-title"><Truck size={22} /> 運賃結果</div></div>
          <div className="card-body">
            <FreightResultCard matchedProduct={matchedProduct} prefecture={prefecture} carrier={currentCarrier} priceDetail={priceDetail} />
          </div>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-head"><div className="card-title">CSV一括登録</div></div>
          <div className="card-body">
            <div className="csv-grid">
              <div>
                <label className="label">商品マスタCSVを貼り付け</label>
                <textarea className="textarea" value={productCsvText} onChange={(e) => setProductCsvText(e.target.value)} />
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" onClick={() => productFileInputRef.current && productFileInputRef.current.click()}>
                    <Upload size={16} /> 商品マスタCSVファイルを取り込む
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={importProductsFromCsv}>商品マスタを読み込む</button>
                  <input ref={productFileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleProductFileChange} />
                </div>
                <div className="hint">先にCSVファイルを選ぶと、内容がこの欄に入ります。そのあと「商品マスタを読み込む」を押してください。</div>
              </div>
              <div className="header-box">
                <div className="header-box-title"><Package size={16} /> 対応ヘッダー</div>
                <div>code, name, standardSize, actualWeight, cubicWeight</div>
                <div style={{ marginTop: 8 }}>または</div>
                <div>品番, 品名, 基準サイズ または 基準, 実重量, m3重量</div>
              </div>
            </div>

            <div className="csv-grid" style={{ marginTop: 24 }}>
              <div>
                <label className="label">運賃表CSVを貼り付け</label>
                <textarea className="textarea" value={carrierCsvText} onChange={(e) => setCarrierCsvText(e.target.value)} />
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" onClick={() => carrierFileInputRef.current && carrierFileInputRef.current.click()}>
                    <Upload size={16} /> 運賃表CSVファイルを取り込む
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={importCarriersFromCsv}>運賃表を読み込む</button>
                  <input ref={carrierFileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleCarrierFileChange} />
                </div>
                <div className="hint">先にCSVファイルを選ぶと、内容がこの欄に入ります。そのあと「運賃表を読み込む」を押してください。</div>
              </div>
              <div className="header-box">
                <div className="header-box-title"><Package size={16} /> 対応ヘッダー</div>
                <div>carrier, size, weight, region, price, islandSurcharge, relaySurcharge</div>
                <div style={{ marginTop: 8 }}>または</div>
                <div>運送会社, サイズ, 重量, 地域, 運賃, 離島加算, 中継料</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>同じ運送会社名ごとに1つの運賃表として自動でまとめます。</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
