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
  return `¥${toNumber(value).toLocaleString("ja-JP")}`;
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
  if (!row) return 0;
  if (row.calcType === "weight") {
    return toNumber(row.matchedWeight || row.referenceValue || 0);
  }
  return toNumber(row.matchedSize || row.referenceValue || 0);
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
      <div className="app-shell">
        <header className="page-header">
          <h1>🚚 運賃検索</h1>
          <p>品番・品名から候補運送会社の運賃を比較</p>
        </header>

        {loading && (
          <section className="panel">
            <div className="panel-body">CSVを読み込み中です</div>
          </section>
        )}

        {!loading && loadError && (
          <section className="panel">
            <div className="panel-body error-text">{loadError}</div>
          </section>
        )}

        {!loading && !loadError && (
          <>
            <section className="panel">
              <div className="panel-header">
                <h2>検索条件</h2>
              </div>

              <div className="panel-body">
                <div className="controls-grid">
                  <div className="control">
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
                        className="btn btn-ghost"
                        onClick={() => setKeyword("")}
                      >
                        クリア
                      </button>
                    </div>
                  </div>

                  <div className="control">
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

                <div className="chips-row">
                  <span className="chip">検索件数: {candidateProducts.length}</span>
                  <span className="chip">選択商品: {selectedCode || "-"}</span>
                  <span className="chip">配送先: {prefecture || "-"}</span>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>検索候補一覧</h2>
              </div>

              <div className="panel-body">
                {candidateProducts.length === 0 ? (
                  <div className="empty-text">該当する商品がありません</div>
                ) : (
                  <div className="candidate-grid">
                    {candidateProducts.map((product) => {
                      const code = getProductCode(product);
                      const name = getProductName(product);
                      const isActive = code === selectedCode;

                      return (
                        <button
                          key={`${code}-${name}`}
                          type="button"
                          className={`candidate-card ${isActive ? "active" : ""}`}
                          onClick={() => setSelectedProduct(product)}
                        >
                          <div className="candidate-code">{code || "-"}</div>
                          <div className="candidate-name">{name || "(名称なし)"}</div>
                          <div className="candidate-sub">
                            <span>佐川サイズ: {toNumber(product?.["佐川サイズ"]) || "-"}</span>
                            <span>西濃重量: {toNumber(product?.["西濃重量"]) || "-"}</span>
                            <span>久留米重量: {toNumber(product?.["久留米重量"]) || "-"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>運賃結果</h2>
              </div>

              <div className="panel-body">
                {!selectedProduct ? (
                  <div className="empty-text">商品を選択してください</div>
                ) : (
                  <>
                    <div className="hero-card">
                      <div className="hero-left">
                        <div className="hero-label">最安候補</div>
                        <div className="hero-price">
                          {bestFare ? formatCurrency(bestFare.total) : "-"}
                        </div>
                        <div className="hero-chips">
                          <span className="hero-chip">
                            {bestFare ? normalizeCarrierName(bestFare.carrier) : "該当なし"}
                          </span>
                          <span className="hero-chip">
                            候補元: {bestFare ? bestFare.source : "-"}
                          </span>
                          <span className="hero-chip">
                            参照: {bestFare ? getRefTypeLabel(bestFare) : "-"}
                          </span>
                          <span className="hero-chip">
                            地域: {bestFare ? toStr(bestFare.region) : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="info-grid">
                      <div className="info-card info-card-wide">
                        <div className="info-label">選択商品</div>
                        <div className="info-value">{getDisplayLabel(selectedProduct)}</div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">佐川サイズ</div>
                        <div className="info-value">
                          {toNumber(selectedProduct?.["佐川サイズ"]) || "-"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">西濃重量</div>
                        <div className="info-value">
                          {toNumber(selectedProduct?.["西濃重量"]) || "-"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">久留米重量</div>
                        <div className="info-value">
                          {toNumber(selectedProduct?.["久留米重量"]) || "-"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">送り先</div>
                        <div className="info-value">{prefecture || "-"}</div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">運送便①</div>
                        <div className="info-value">
                          {toStr(selectedProduct?.["運送便①"]) || "-"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">運送便②</div>
                        <div className="info-value">
                          {toStr(selectedProduct?.["運送便②"]) || "-"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">運送便③</div>
                        <div className="info-value">
                          {toStr(selectedProduct?.["運送便③"]) || "-"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">西濃別表</div>
                        <div className="info-value">
                          {toStr(selectedProduct?.["西濃別表"]) || "0"}
                        </div>
                      </div>
                      <div className="info-card">
                        <div className="info-label">表示候補数</div>
                        <div className="info-value">{fareResults.length}</div>
                      </div>
                    </div>

                    {fareResults.length === 0 ? (
                      <div className="empty-text">表示できる運賃候補がありません</div>
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
                              <th>離島加算</th>
                              <th>中継料</th>
                              <th>合計</th>
                              <th>状態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fareResults.map((row) => {
                              const carrier = normalizeCarrierName(row.carrier);
                              const originalCarrier = normalizeCarrierName(row.originalCarrier);

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
                                  <td className="total-cell">{formatCurrency(row.total)}</td>
                                  <td>
                                    {row.isCheapest ? (
                                      <span className="badge badge-best">最安</span>
                                    ) : (
                                      <span className="badge badge-normal">候補</span>
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
