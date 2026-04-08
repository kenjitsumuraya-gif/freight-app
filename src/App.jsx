import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { loadCsv } from "./csv.js";
import { buildFareResults } from "./fare.js";

function App() {
  const [products, setProducts] = useState([]);
  const [carrierRates, setCarrierRates] = useState([]);
  const [carrierRegions, setCarrierRegions] = useState([]);
  const [specialSeinoRates, setSpecialSeinoRates] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [prefecture, setPrefecture] = useState("高知県");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError("");

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
        setError("CSVの読み込みに失敗しました。public フォルダ内のファイルを確認してください。");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const prefectures = [
    "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
    "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
    "新潟県","富山県","石川県","福井県","山梨県","長野県",
    "岐阜県","静岡県","愛知県","三重県",
    "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
    "鳥取県","島根県","岡山県","広島県","山口県",
    "徳島県","香川県","愛媛県","高知県",
    "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
  ];

  const candidates = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];

    return products.filter((item) => {
      const code = String(item["品番"] || "").toLowerCase();
      const name = String(item["品名"] || "").toLowerCase();
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

  const handleClear = () => {
    setKeyword("");
    setSelectedProduct(null);
    setResults([]);
    setError("");
  };

  const handleSelectProduct = (item) => {
    setSelectedProduct(item);
  };

  const bestResult = results.length > 0 ? results[0] : null;

  return (
    <div className="app-shell">
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">品番・品名から運賃を調べるアプリ</h1>
          <p className="page-description">
            品番の完全一致だけでなく、品名や品番の部分一致でも検索できます。商品CSVの運送便①〜③を見て候補運賃を表示します。
          </p>
        </header>

        <div className="status-banner">
          {loading
            ? "GitHub上のCSVを読み込み中です。"
            : error
            ? error
            : "GitHub上のCSVを自動読み込みしました。"}
        </div>

        <section className="top-grid">
          <div className="panel search-panel">
            <div className="panel-title-row">
              <div className="panel-title-group">
                <span className="panel-icon">⌕</span>
                <h2 className="panel-title">検索条件</h2>
              </div>
            </div>

            <div className="form-block">
              <div className="label-row with-button">
                <label className="field-label">品番または品名</label>
                <button
                  type="button"
                  className="clear-button"
                  onClick={handleClear}
                >
                  クリア
                </button>
              </div>

              <input
                type="text"
                className="text-input"
                value={keyword}
                placeholder="品番または品名を入力"
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setSelectedProduct(null);
                  setResults([]);
                }}
              />

              <div className="field-help">
                部分一致のあいまい検索に対応しています。
              </div>
            </div>

            <div className="form-block">
              <label className="field-label">送り先の都道府県</label>
              <select
                className="select-input"
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
              >
                {prefectures.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel candidates-panel">
            <div className="panel-title-row">
              <h2 className="panel-title">検索候補一覧</h2>
            </div>

            <div className="candidate-table-wrap">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>品番</th>
                    <th>品名</th>
                    <th>基準</th>
                    <th>実重量</th>
                    <th>m³重量</th>
                  </tr>
                </thead>
                <tbody>
                  {keyword.trim() === "" ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        検索条件を入力してください
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        候補が見つかりません
                      </td>
                    </tr>
                  ) : (
                    candidates.slice(0, 8).map((item, index) => {
                      const isActive =
                        selectedProduct &&
                        selectedProduct["品番"] === item["品番"] &&
                        selectedProduct["品名"] === item["品名"];

                      return (
                        <tr
                          key={`${item["品番"] || "no-code"}-${index}`}
                          className={`candidate-row ${isActive ? "active" : ""}`}
                          onClick={() => handleSelectProduct(item)}
                        >
                          <td className="candidate-code-cell">{item["品番"]}</td>
                          <td className="candidate-name-cell">{item["品名"]}</td>
                          <td>{item["基準サイズ"] || "-"}</td>
                          <td>{item["実重量"] || "-"}</td>
                          <td>{item["m3重量"] || item["m³重量"] || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="results-section">
          <div className="section-heading-row">
            <span className="section-icon">🚚</span>
            <h2 className="section-heading">運賃結果</h2>
          </div>

          {!selectedProduct ? (
            <div className="placeholder-card">
              検索候補から商品を選択してください。
            </div>
          ) : results.length === 0 ? (
            <div className="placeholder-card">
              該当する運賃がありません。
            </div>
          ) : (
            <>
              {bestResult && (
                <div className="best-price-card">
                  <div className="best-price-label">最安候補</div>
                  <div className="best-price-value">
                    ¥{Number(bestResult["合計"] || 0).toLocaleString()}
                  </div>
                  <div className="best-price-meta">
                    {bestResult["運送会社"]} / {prefecture} / {bestResult["地域"]} /{" "}
                    {bestResult["運送会社"] === "西濃"
                      ? `重量 ${bestResult["適用重量"]}`
                      : `サイズ ${bestResult["適用サイズ"]}`}
                  </div>
                </div>
              )}

              <div className="result-table-card">
                <table className="result-table">
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
                    {results.map((row, index) => (
                      <tr key={`${row["運送会社"]}-${row["地域"]}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{row["運送会社"]}</td>
                        <td>{row["地域"]}</td>
                        <td>{row["適用サイズ"] || "-"}</td>
                        <td>{row["適用重量"] || "-"}</td>
                        <td>¥{Number(row["基本運賃"] || 0).toLocaleString()}</td>
                        <td>¥{Number(row["離島加算"] || 0).toLocaleString()}</td>
                        <td>¥{Number(row["中継加算"] || 0).toLocaleString()}</td>
                        <td className="total-cell">
                          ¥{Number(row["合計"] || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="selected-product-note">
                <span className="selected-label">選択商品:</span>{" "}
                {selectedProduct["品番"]} / {selectedProduct["品名"]}
                {" / "}
                西濃別表
                {selectedProduct["西濃別表"] === "1" ? " 対象" : " 通常"}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
