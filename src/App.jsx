import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { loadCsv } from "./csv.js";
import { buildFareResults } from "./fare.js";

const PREFECTURES = [
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

function toStr(value) {
  return value == null ? "" : String(value).trim();
}

function toNumber(value) {
  if (value == null || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function formatYen(value) {
  const num = toNumber(value);
  return `¥${num.toLocaleString("ja-JP")}`;
}

function getProductKey(product) {
  return `${toStr(product?.["品番"])}__${toStr(product?.["品名"])}`;
}

function getCalcTypeLabel(row) {
  if (row?.calcType === "weight") return "重量";
  if (row?.calcType === "size") return "サイズ";
  return "-";
}

function getReferenceValueLabel(row) {
  if (row?.calcType === "weight") {
    return row?.matchedWeight ? `${row.matchedWeight}` : `${row.chargeableWeight || 0}`;
  }
  if (row?.calcType === "size") {
    return row?.matchedSize ? `${row.matchedSize}` : `${row.size || 0}`;
  }
  return "-";
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [carrierRegions, setCarrierRegions] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [carriersSeino, setCarriersSeino] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [prefecture, setPrefecture] = useState("愛媛県");
  const [selectedProductKey, setSelectedProductKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchAllCsv() {
      try {
        setLoading(true);
        setLoadError("");

        const [productsData, carrierRegionsData, carriersData, carriersSeinoData] =
          await Promise.all([
            loadCsv("/products.csv"),
            loadCsv("/carrier_regions.csv"),
            loadCsv("/carriers.csv"),
            loadCsv("/carriers_seino.csv"),
          ]);

        if (cancelled) return;

        setProducts(Array.isArray(productsData) ? productsData : []);
        setCarrierRegions(Array.isArray(carrierRegionsData) ? carrierRegionsData : []);
        setCarriers(Array.isArray(carriersData) ? carriersData : []);
        setCarriersSeino(Array.isArray(carriersSeinoData) ? carriersSeinoData : []);
      } catch (error) {
        if (cancelled) return;
        setLoadError("CSVの読み込みに失敗しました。ファイル名と配置を確認してください。");
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAllCsv();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = toStr(searchText).toLowerCase();

    const sorted = [...products].sort((a, b) => {
      const aCode = toStr(a["品番"]);
      const bCode = toStr(b["品番"]);
      return aCode.localeCompare(bCode, "ja");
    });

    if (!keyword) {
      return sorted.slice(0, 100);
    }

    return sorted.filter((product) => {
      const code = toStr(product["品番"]).toLowerCase();
      const name = toStr(product["品名"]).toLowerCase();
      return code.includes(keyword) || name.includes(keyword);
    });
  }, [products, searchText]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductKey) return null;

    return (
      filteredProducts.find((product) => getProductKey(product) === selectedProductKey) ||
      products.find((product) => getProductKey(product) === selectedProductKey) ||
      null
    );
  }, [filteredProducts, products, selectedProductKey]);

  const fareResults = useMemo(() => {
    if (!selectedProduct || !prefecture) return [];

    try {
      return buildFareResults({
        product: selectedProduct,
        prefecture,
        carrierRegions,
        carriers,
        carriersSeino,
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [selectedProduct, prefecture, carrierRegions, carriers, carriersSeino]);

  const bestResult = fareResults.length > 0 ? fareResults[0] : null;

  function handleClear() {
    setSearchText("");
    setSelectedProductKey("");
  }

  function handleSelectProduct(product) {
    setSelectedProductKey(getProductKey(product));
  }

  function handleSearchChange(event) {
    setSearchText(event.target.value);
    setSelectedProductKey("");
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1 className="page-title">品番・品名から運賃を調べるアプリ</h1>
        <p className="page-subtitle">
          品番の完全一致だけでなく、品名や品番の部分一致でも検索できます。商品CSVの運送便①〜③を見て候補運賃を表示します。
        </p>
      </header>

      <main className="layout-stack">
        <section className="top-grid">
          <div className="card panel-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-title-icon">⌕</span>
                <span>検索条件</span>
              </h2>
            </div>

            <div className="form-block">
              <div className="field-row">
                <label className="field-label" htmlFor="searchText">
                  品番または品名
                </label>
                <button type="button" className="clear-button" onClick={handleClear}>
                  クリア
                </button>
              </div>

              <input
                id="searchText"
                className="text-input"
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="品番または品名を入力"
              />

              <p className="field-help">
                空欄でも一覧表示します。入力すると絞り込みます。
              </p>
            </div>

            <div className="form-block">
              <label className="field-label" htmlFor="prefecture">
                送り先の都道府県
              </label>

              <select
                id="prefecture"
                className="select-input"
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
              >
                {PREFECTURES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card panel-card">
            <div className="card-header">
              <h2 className="card-title">検索候補一覧</h2>
            </div>

            <div className="candidate-table-wrap">
              <div className="table-scroll">
                <table className="data-table candidate-table">
                  <thead>
                    <tr>
                      <th>品番</th>
                      <th>品名</th>
                      <th>基準</th>
                      <th>実重量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="empty-cell">
                          CSVを読み込み中です。
                        </td>
                      </tr>
                    ) : loadError ? (
                      <tr>
                        <td colSpan="4" className="empty-cell">
                          {loadError}
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-cell">
                          該当する商品がありません。
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const productKey = getProductKey(product);
                        const isSelected = selectedProductKey === productKey;

                        return (
                          <tr
                            key={productKey}
                            className={isSelected ? "is-selected" : ""}
                            onClick={() => handleSelectProduct(product)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectProduct(product);
                              }
                            }}
                          >
                            <td>{toStr(product["品番"])}</td>
                            <td>{toStr(product["品名"])}</td>
                            <td>{toStr(product["基準サイズ"])}</td>
                            <td>{toStr(product["実重量"])}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="card result-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-title-icon">🚚</span>
              <span>運賃結果</span>
            </h2>
          </div>

          {!selectedProduct ? (
            <div className="result-placeholder">
              検索候補から商品を選択してください。
            </div>
          ) : fareResults.length === 0 ? (
            <div className="result-placeholder">
              運賃表に一致する候補がありません。
            </div>
          ) : (
            <>
              <div className="best-fare-card">
                <div className="best-fare-label">最安候補</div>
                <div className="best-fare-price">{formatYen(bestResult?.total)}</div>
                <div className="best-fare-meta">
                  <span className="best-fare-chip">{bestResult?.carrier}</span>
                  <span className="best-fare-chip">{bestResult?.candidateLabel}</span>
                  <span className="best-fare-chip">
                    参照: {getCalcTypeLabel(bestResult)}
                  </span>
                  <span className="best-fare-chip">
                    地域: {bestResult?.region || "-"}
                  </span>
                </div>
              </div>

              <div className="selected-product-summary">
                <div className="summary-row">
                  <span className="summary-label">選択商品</span>
                  <span className="summary-value">
                    {toStr(selectedProduct["品番"])} / {toStr(selectedProduct["品名"])}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">基準サイズ</span>
                  <span className="summary-value">
                    {toStr(selectedProduct["基準サイズ"]) || "-"}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">実重量</span>
                  <span className="summary-value">
                    {toStr(selectedProduct["実重量"]) || "-"}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">m3重量</span>
                  <span className="summary-value">
                    {toStr(selectedProduct["m3重量"]) || "-"}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">送り先</span>
                  <span className="summary-value">{prefecture}</span>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table result-table">
                  <thead>
                    <tr>
                      <th>運送会社</th>
                      <th>候補元</th>
                      <th>参照</th>
                      <th>参照値</th>
                      <th>地域</th>
                      <th>運賃</th>
                      <th>離島加算</th>
                      <th>中継料</th>
                      <th>合計</th>
                      <th>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fareResults.map((row, index) => (
                      <tr
                        key={`${row.carrier}-${row.source}-${index}`}
                        className={row.isCheapest ? "is-cheapest" : ""}
                      >
                        <td>{row.carrier}</td>
                        <td>{row.candidateLabel}</td>
                        <td>{getCalcTypeLabel(row)}</td>
                        <td>{getReferenceValueLabel(row)}</td>
                        <td>{row.region || "-"}</td>
                        <td>{formatYen(row.fare)}</td>
                        <td>{formatYen(row.islandFee)}</td>
                        <td>{formatYen(row.relayFee)}</td>
                        <td className="total-cell">{formatYen(row.total)}</td>
                        <td>
                          {row.isCheapest ? (
                            <span className="cheapest-badge">最安</span>
                          ) : (
                            <span className="normal-badge">候補</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
