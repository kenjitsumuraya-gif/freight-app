import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type {
  Product,
  CarrierRateRow,
  CarrierRegionRow,
  FareResult,
} from "./types";
import { loadCsv } from "./csv";
import { buildFareResults } from "./fare";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [carrierRates, setCarrierRates] = useState<CarrierRateRow[]>([]);
  const [carrierRegions, setCarrierRegions] = useState<CarrierRegionRow[]>([]);
  const [specialSeinoRates, setSpecialSeinoRates] = useState<CarrierRateRow[]>(
    []
  );

  const [keyword, setKeyword] = useState("");
  const [prefecture, setPrefecture] = useState("大阪府");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [results, setResults] = useState<FareResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError("");

        const [p, c, r, s] = await Promise.all([
          loadCsv<Product>("/products.csv"),
          loadCsv<CarrierRateRow>("/carriers_final_complete.csv"),
          loadCsv<CarrierRegionRow>("/carrier_regions.csv"),
          loadCsv<CarrierRateRow>("/carriers_seino_special.csv"),
        ]);

        setProducts(p);
        setCarrierRates(c);
        setCarrierRegions(r);
        setSpecialSeinoRates(s);
      } catch (err) {
        console.error(err);
        setError(
          "CSVの読み込みに失敗しました。publicフォルダ内のファイル名と列名を確認してください。"
        );
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const candidates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];

    return products.filter((item) => {
      const code = (item["品番"] ?? "").toLowerCase();
      const name = (item["品名"] ?? "").toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [keyword, products]);

  useEffect(() => {
    if (!selectedProduct) {
      setResults([]);
      return;
    }

    try {
      const fares = buildFareResults(
        selectedProduct,
        prefecture,
        carrierRegions,
        carrierRates,
        specialSeinoRates
      );
      setResults(fares);
    } catch (err) {
      console.error(err);
      setResults([]);
    }
  }, [
    selectedProduct,
    prefecture,
    carrierRegions,
    carrierRates,
    specialSeinoRates,
  ]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleClear = () => {
    setKeyword("");
    setSelectedProduct(null);
    setResults([]);
    setError("");
  };

  const prefectures = [
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "秋田県",
    "山形県",
    "福島県",
    "茨城県",
    "栃木県",
    "群馬県",
    "埼玉県",
    "千葉県",
    "東京都",
    "神奈川県",
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
    "三重県",
    "滋賀県",
    "京都府",
    "大阪府",
    "兵庫県",
    "奈良県",
    "和歌山県",
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県",
  ];

  return (
    <div className="app">
      <h1 className="page-title">運賃検索アプリ</h1>

      <div className="toolbar">
        <input
          type="text"
          value={keyword}
          placeholder="品番または品名で検索"
          onChange={(e) => {
            setKeyword(e.target.value);
            setSelectedProduct(null);
            setResults([]);
          }}
        />

        <select
          value={prefecture}
          onChange={(e) => setPrefecture(e.target.value)}
        >
          {prefectures.map((pref) => (
            <option key={pref} value={pref}>
              {pref}
            </option>
          ))}
        </select>

        <button type="button" onClick={handleClear}>
          クリア
        </button>
      </div>

      {loading && <div className="info-message">CSVを読み込み中です。</div>}

      {!loading && error && <div className="error-message">{error}</div>}

      {!loading && !selectedProduct && keyword.trim() !== "" && (
        <div className="candidate-list">
          {candidates.length === 0 ? (
            <div className="info-message">候補が見つかりません。</div>
          ) : (
            candidates.map((item) => (
              <button
                key={`${item["品番"]}-${item["品名"]}`}
                type="button"
                className="candidate-item"
                onClick={() => handleSelectProduct(item)}
              >
                <span className="candidate-code">{item["品番"]}</span>
                <span className="candidate-name">{item["品名"]}</span>
              </button>
            ))
          )}
        </div>
      )}

      {selectedProduct && (
        <div className="selected-product">
          <div>
            <strong>選択中</strong>
          </div>
          <div>
            {selectedProduct["品番"]} / {selectedProduct["品名"]}
          </div>
          <div>
            西濃別表:
            {selectedProduct["西濃別表"] === "1" ? " 対象" : " 通常"}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>運送会社</th>
              <th>地域</th>
              <th>適用サイズ</th>
              <th>適用重量</th>
              <th>基本運賃</th>
              <th>離島加算</th>
              <th>中継加算</th>
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            {!selectedProduct ? (
              <tr>
                <td colSpan={9}>商品を選択してください</td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={9}>該当する運賃がありません</td>
              </tr>
            ) : (
              results.map((row, index) => (
                <tr key={`${row["運送会社"]}-${row["地域"]}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{row["運送会社"]}</td>
                  <td>{row["地域"]}</td>
                  <td>{row["適用サイズ"]}</td>
                  <td>{row["適用重量"]}</td>
                  <td>{Number(row["基本運賃"]).toLocaleString()}</td>
                  <td>{Number(row["離島加算"]).toLocaleString()}</td>
                  <td>{Number(row["中継加算"]).toLocaleString()}</td>
                  <td>{Number(row["合計"]).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
