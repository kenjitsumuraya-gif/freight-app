import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { buildFareResults, findBestFare } from "./fare";
import * as csvModule from "./csv";

const loadCsvFn = csvModule.loadCsv || csvModule.loadCSV;

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
  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function normalizeCarrierName(name) {
  const v = toStr(name);
  if (!v) return "";
  if (v.includes("西濃")) return "西濃";
  if (v.includes("久留米")) return "久留米";
  if (v.includes("佐川")) return "佐川";
  if (v.includes("ヤマト")) return "ヤマト";
  if (v.includes("福山")) return "福山通運";
  return v;
}

function formatCurrency(value) {
  const num = toNumber(value);
  return `¥${num.toLocaleString("ja-JP")}`;
}

function getProductCode(product) {
  return toStr(
    product?.["品番"] ??
      product?.["商品コード"] ??
      product?.["コード"] ??
      product?.["品目コード"]
  );
}

function getProductName(product) {
  return toStr(product?.["品名"] ?? product?.["商品名"] ?? product?.["名称"]);
}

function getDisplayLabel(product) {
  const code = getProductCode(product);
  const name = getProductName(product);

  if (code && name) return `${code} / ${name}`;
  return code || name || "(名称なし)";
}

function includesKeyword(product, keyword) {
  const q = toStr(keyword).toLowerCase();
  if (!q) return true;

  const code = getProductCode(product).toLowerCase();
  const name = getProductName(product).toLowerCase();

  return code.includes(q) || name.includes(q);
}

function getRefTypeLabel(row) {
  return row?.calcType === "weight" ? "重量" : "サイズ";
}

function getRefValue(row) {
  if (row?.calcType === "weight") {
    return toNumber(row?.matchedWeight || row?.referenceValue || 0);
  }
  return toNumber(row?.matchedSize || row?.referenceValue || 0);
}

function getStatusLabel(row) {
  if (!row) return "";
  return row.cheapestBadge || "";
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [carriersSeino, setCarriersSeino] = useState([]);
  const [carrierRegions, setCarrierRegions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [prefecture, setPrefecture] = useState("大阪府");
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchAll() {
      try {
        setLoading(true);
        setLoadError("");

        if (!loadCsvFn) {
          throw new Error("csv.js に loadCsv または loadCSV が見つかりません。");
        }

        const [productsData, carriersData, seinoData, regionsData] =
          await Promise.all([
            loadCsvFn("/products.csv"),
            loadCsvFn("/carriers.csv"),
            loadCsvFn("/carriers_seino.csv"),
            loadCsvFn("/carrier_regions.csv"),
          ]);

        if (!active) return;

        setProducts(Array.isArray(productsData) ? productsData : []);
        setCarriers(Array.isArray(carriersData) ? carriersData : []);
        setCarriersSeino(Array.isArray(seinoData) ? seinoData : []);
        setCarrierRegions(Array.isArray(regionsData) ? regionsData : []);
      } catch (error) {
        if (!active) return;
        setLoadError(error?.message || "CSVの読み込みに失敗しました。");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      active = false;
    };
  }, []);

  const candidateProducts = useMemo(() => {
    const list = products.filter((product) => includesKeyword(product, keyword));

    list.sort((a, b) => {
      const aCode = getProductCode(a);
      const bCode = getProductCode(b);
      return aCode.localeCompare(bCode, "ja");
    });

    return list.slice(0, 100);
  }, [products, keyword]);

  useEffect(() => {
    if (!candidateProducts.length) {
      setSelectedProduct(null);
      return;
    }

    const currentCode = getProductCode(selectedProduct);
    const found = candidateProducts.find(
      (item) => getProductCode(item) === currentCode
    );

    if (!found) {
      setSelectedProduct(candidateProducts[0]);
    }
  }, [candidateProducts, selectedProduct]);

  const fareResults = useMemo(() => {
    if (!selectedProduct || !prefecture) return [];

    return buildFareResults({
      product: selectedProduct,
      prefecture,
      carrierRegions,
      carriers,
      carriersSeino,
    });
  }, [selectedProduct, prefecture, carrierRegions, carriers, carriersSeino]);

  const bestFare = useMemo(() => {
    if (!selectedProduct || !prefecture) return null;

    return findBestFare({
      product: selectedProduct,
      prefecture,
      carrierRegions,
      carriers,
      carriersSeino,
    });
  }, [selectedProduct, prefecture, carrierRegions, carriers, carriersSeino]);

  const selectedCode = getProductCode(selectedProduct);
  const selectedName = getProductName(selectedProduct);

  return (
    <div className="app">
      <div className="container compact">
        <header className="page-header">
          <h1>運賃検索</h1>
          <p>品番・品名から候補運送会社の運賃を比較</p>
        </header>

        {loading && (
          <div className="card">
            <div className="card-body">CSVを読み込み中です</div>
          </div>
        )}

        {!loading && loadError && (
          <div className="card">
            <div className="card-body error-text">{loadError}</div>
          </div>
        )}

        {!loading && !loadError && (
          <>
            <section className="card">
              <div className="card-header">
                <h2>検索条件</h2>
              </div>

              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="keyword">品番・品名</label>
                    <div className="input-row">
                      <input
                        id="keyword"
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="品番または品名で検索"
                      />
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setKeyword("")}
                      >
                        クリア
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="prefecture">都道府県</label>
                    <select
                      id="prefecture"
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

                <div className="summary-row">
                  <div className="summary-chip">
                    検索件数: {candidateProducts.length}
                  </div>
                  <div className="summary-chip">
                    選択商品: {selectedCode || "-"}
                  </div>
                  <div className="summary-chip">配送先: {prefecture || "-"}</div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>検索候補一覧</h2>
              </div>

              <div className="card-body compact-list-wrap">
                {candidateProducts.length === 0 ? (
                  <div className="empty-text">該当する商品がありません</div>
                ) : (
                  <div className="candidate-list">
                    {candidateProducts.map((product) => {
                      const code = getProductCode(product);
                      const name = getProductName(product);
                      const isActive = code === selectedCode;

                      return (
                        <button
                          key={`${code}-${name}`}
                          type="button"
                          className={`candidate-item ${isActive ? "active" : ""}`}
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="candidate-code">{code || "-"}</div>
                          <div className="candidate-name">{name || "(名称なし)"}</div>
                          <div className="candidate-meta">
                            <span>
                              佐川サイズ: {toNumber(product?.["佐川サイズ"]) || "-"}
                            </span>
                            <span>
                              西濃重量: {toNumber(product?.["西濃重量"]) || "-"}
                            </span>
                            <span>
                              久留米重量: {toNumber(product?.["久留米重量"]) || "-"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>運賃結果</h2>
              </div>

              <div className="card-body">
                {!selectedProduct ? (
                  <div className="empty-text">商品を選択してください</div>
                ) : (
                  <>
                    <div className="result-top-card">
                      <div className="result-top-main">
                        <div className="result-top-title">最安候補</div>
                        <div className="result-top-product">
                          {getDisplayLabel(selectedProduct)}
                        </div>
                      </div>

                      {bestFare ? (
                        <div className="result-top-price-block">
                          <div className="badge cheapest">最安</div>
                          <div className="result-top-carrier">
                            {normalizeCarrierName(bestFare.carrier)}
                          </div>
                          <div className="result-top-price">
                            {formatCurrency(bestFare.total)}
                          </div>
                          <div className="result-top-sub">
                            {bestFare.source} / {prefecture}
                          </div>
                        </div>
                      ) : (
                        <div className="result-top-price-block">
                          <div className="result-top-carrier">該当なし</div>
                        </div>
                      )}
                    </div>

                    <div className="selected-product-box">
                      <div>
                        <strong>品番:</strong> {selectedCode || "-"}
                      </div>
                      <div>
                        <strong>品名:</strong> {selectedName || "-"}
                      </div>
                      <div>
                        <strong>佐川サイズ:</strong>{" "}
                        {toNumber(selectedProduct?.["佐川サイズ"]) || "-"}
                      </div>
                      <div>
                        <strong>西濃重量:</strong>{" "}
                        {toNumber(selectedProduct?.["西濃重量"]) || "-"}
                      </div>
                      <div>
                        <strong>久留米重量:</strong>{" "}
                        {toNumber(selectedProduct?.["久留米重量"]) || "-"}
                      </div>
                      <div>
                        <strong>西濃別表:</strong>{" "}
                        {toStr(selectedProduct?.["西濃別表"]) || "0"}
                      </div>
                    </div>

                    {fareResults.length === 0 ? (
                      <div className="empty-text">
                        表示できる運賃候補がありません
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table className="result-table">
                          <thead>
                            <tr>
                              <th>運送会社</th>
                              <th>元候補</th>
                              <th>候補元</th>
                              <th>変換</th>
                              <th>参照</th>
                              <th>参照値</th>
                              <th>地域</th>
                              <th>運賃</th>
                              <th>離島</th>
                              <th>中継</th>
                              <th>合計</th>
                              <th>状態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fareResults.map((row) => {
                              const carrier = normalizeCarrierName(row.carrier);
                              const originalCarrier = normalizeCarrierName(
                                row.originalCarrier
                              );

                              return (
                                <tr
                                  key={`${row.source}-${carrier}-${row.region}-${row.total}`}
                                  className={row.isCheapest ? "is-best" : ""}
                                >
                                  <td>{carrier || "-"}</td>
                                  <td>{originalCarrier || "-"}</td>
                                  <td>{row.source || "-"}</td>
                                  <td>{row.displayCarrierNote || "-"}</td>
                                  <td>{getRefTypeLabel(row)}</td>
                                  <td>{getRefValue(row) || "-"}</td>
                                  <td>{toStr(row.region) || "-"}</td>
                                  <td>{formatCurrency(row.fare)}</td>
                                  <td>{formatCurrency(row.islandFee)}</td>
                                  <td>{formatCurrency(row.relayFee)}</td>
                                  <td className="total-cell">
                                    {formatCurrency(row.total)}
                                  </td>
                                  <td>
                                    {row.isCheapest ? (
                                      <span className="badge cheapest">
                                        {getStatusLabel(row)}
                                      </span>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
