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
  const [prefecture, setPrefecture] = useState("宮崎県");
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

  return (
    <div className="fare-app">
      <div className="page-wrap">
        <header className="app-header">
          <h1>品番・品名から運賃を調べるアプリ</h1>
          <p>
            品番の完全一致だけでなく、品名や語番の部分一致でも検索できます。商品CSVの運送便①〜③を見て候補運賃を表示します。
          </p>
        </header>

        {loading && (
          <div className="panel">
            <div className="panel-body">CSVを読み込み中です</div>
          </div>
        )}

        {!loading && loadError && (
          <div className="panel">
            <div className="panel-body error-text">{loadError}</div>
          </div>
        )}

        {!loading && !loadError && (
          <>
            <section className="top-grid">
              <div className="panel">
                <div className="panel-header panel-header-icon">
                  <h2>検索条件</h2>
                </div>

                <div className="panel-body">
                  <div className="field-block">
                    <label>品番または品名</label>
                    <div className="search-row">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="品番または品名を入力"
                      />
                      <button
                        type="button"
                        className="clear-button"
                        onClick={() => setKeyword("")}
                      >
                        クリア
                      </button>
                    </div>
                    <div className="hint-text">
                      空欄でも一覧表示します。入力すると絞り込みます。
                    </div>
                  </div>

                  <div className="field-block">
                    <label>送り先の都道府県</label>
                    <div className="select-wrap">
                      <select
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
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>検索候補一覧</h2>
                </div>

                <div className="panel-body candidate-table-wrap">
                  {candidateProducts.length === 0 ? (
                    <div className="empty-text">該当する商品がありません</div>
                  ) : (
                    <table className="candidate-table">
                      <thead>
                        <tr>
                          <th className="col-code">品番</th>
                          <th>品名</th>
                          <th className="col-mini">基準</th>
                          <th className="col-mini">実重量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidateProducts.map((product) => {
                          const code = getProductCode(product);
                          const isActive =
                            code &&
                            code === getProductCode(selectedProduct);

                          return (
                            <tr
                              key={`${code}-${getProductName(product)}`}
                              className={isActive ? "active" : ""}
                              onClick={() => setSelectedProduct(product)}
                            >
                              <td className="col-code">{code || "-"}</td>
                              <td>{getProductName(product) || "-"}</td>
                              <td className="col-mini">
                                {toNumber(product?.["佐川サイズ"]) || "-"}
                              </td>
                              <td className="col-mini">
                                {toNumber(product?.["西濃重量"]) || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>

            <section className="panel results-panel">
              <div className="panel-header panel-header-icon">
                <h2>運賃結果</h2>
              </div>

              <div className="panel-body">
                {!selectedProduct ? (
                  <div className="empty-text">商品を選択してください</div>
                ) : (
                  <>
                    <div className="best-card">
                      <div className="best-card-label">最安候補</div>
                      <div className="best-card-price">
                        {bestFare ? formatCurrency(bestFare.total) : "¥0"}
                      </div>
                      <div className="best-card-chips">
                        <span className="best-chip">
                          {bestFare ? normalizeCarrierName(bestFare.carrier) : "-"}
                        </span>
                        <span className="best-chip">
                          候補元: {bestFare ? bestFare.source : "-"}
                        </span>
                        <span className="best-chip">
                          参照: {bestFare ? getRefTypeLabel(bestFare) : "-"}
                        </span>
                        <span className="best-chip">
                          地域: {bestFare ? toStr(bestFare.region) : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="meta-grid">
                      <div className="meta-card meta-card-wide">
                        <div className="meta-label">選択商品</div>
                        <div className="meta-value">
                          {getDisplayLabel(selectedProduct)}
                        </div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">基準サイズ</div>
                        <div className="meta-value">
                          {toNumber(selectedProduct?.["佐川サイズ"]) || "-"}
                        </div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">実重量</div>
                        <div className="meta-value">-</div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">m3重量</div>
                        <div className="meta-value">-</div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">送り先</div>
                        <div className="meta-value">{prefecture || "-"}</div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">運送便①</div>
                        <div className="meta-value">
                          {toStr(selectedProduct?.["運送便①"]) || "-"}
                        </div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">運送便②</div>
                        <div className="meta-value">
                          {toStr(selectedProduct?.["運送便②"]) || "-"}
                        </div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">運送便③</div>
                        <div className="meta-value">
                          {toStr(selectedProduct?.["運送便③"]) || "-"}
                        </div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">西濃別表</div>
                        <div className="meta-value">
                          {toStr(selectedProduct?.["西濃別表"]) || "0"}
                        </div>
                      </div>

                      <div className="meta-card">
                        <div className="meta-label">表示候補数</div>
                        <div className="meta-value">{fareResults.length}</div>
                      </div>
                    </div>

                    <div className="result-table-wrap">
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
                          {fareResults.length === 0 ? (
                            <tr>
                              <td colSpan="12" className="empty-row">
                                表示できる運賃候補がありません
                              </td>
                            </tr>
                          ) : (
                            fareResults.map((row) => {
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
                                  <td>{`候補元: ${row.source}`}</td>
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
                                      <span className="status-badge status-best">
                                        最安
                                      </span>
                                    ) : (
                                      <span className="status-badge status-normal">
                                        候補
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
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
