import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { loadCsv } from "./csv";
import { buildFareResults } from "./fare";

function App() {
  const [products, setProducts] = useState([]);
  const [carrierRates, setCarrierRates] = useState([]);
  const [carrierRegions, setCarrierRegions] = useState([]);
  const [specialSeinoRates, setSpecialSeinoRates] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [prefecture, setPrefecture] = useState("大阪府");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [p, c, r, s] = await Promise.all([
          loadCsv("/products.csv"),
          loadCsv("/carriers_final_complete.csv"),
          loadCsv("/carrier_regions.csv"),
          loadCsv("/carriers_seino_special.csv"),
        ]);

        setProducts(p);
        setCarrierRates(c);
        setCarrierRegions(r);
        setSpecialSeinoRates(s);
      } catch (err) {
        console.error(err);
        setError("CSV読み込みエラー");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const candidates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];

    return products.filter(
      (item) =>
        (item["品番"] || "").toLowerCase().includes(q) ||
        (item["品名"] || "").toLowerCase().includes(q)
    );
  }, [keyword, products]);

  useEffect(() => {
    if (!selectedProduct) {
      setResults([]);
      return;
    }

    const fares = buildFareResults(
      selectedProduct,
      prefecture,
      carrierRegions,
      carrierRates,
      specialSeinoRates
    );

    setResults(fares);
  }, [selectedProduct, prefecture, carrierRegions, carrierRates, specialSeinoRates]);

  const handleClear = () => {
    setKeyword("");
    setSelectedProduct(null);
    setResults([]);
  };

  return (
    <div className="app">
      <h1>運賃検索</h1>

      <div className="toolbar">
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setSelectedProduct(null);
          }}
          placeholder="品番 or 品名"
        />

        <select value={prefecture} onChange={(e) => setPrefecture(e.target.value)}>
          <option>大阪府</option>
          <option>兵庫県</option>
          <option>京都府</option>
          <option>東京都</option>
        </select>

        <button onClick={handleClear}>クリア</button>
      </div>

      {loading && <div>読み込み中</div>}
      {error && <div>{error}</div>}

      {!selectedProduct &&
        candidates.map((item) => (
          <button
            key={item["品番"]}
            onClick={() => setSelectedProduct(item)}
          >
            {item["品番"]} / {item["品名"]}
          </button>
        ))}

      {selectedProduct && (
        <div>
          選択: {selectedProduct["品番"]} / {selectedProduct["品名"]}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>順位</th>
            <th>運送会社</th>
            <th>地域</th>
            <th>重量</th>
            <th>合計</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r["運送会社"]}</td>
              <td>{r["地域"]}</td>
              <td>{r["適用重量"]}</td>
              <td>{r["合計"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
