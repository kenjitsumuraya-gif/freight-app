import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { buildFareResults, findBestFare } from "./fare";
import * as csvModule from "./csv";

const loadCsvFn = csvModule.loadCsv || csvModule.loadCSV;

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県",
  "沖縄県",
];

function toStr(v){ return v==null?"":String(v).trim(); }
function toNumber(v){
  if(v==null||v==="")return 0;
  const n=Number(String(v).replace(/,/g,"").replace(/[^\d.-]/g,""));
  return Number.isFinite(n)?n:0;
}
function normalizeCarrierName(name){
  const v=toStr(name);
  if(v.includes("西濃"))return "西濃";
  if(v.includes("久留米"))return "久留米";
  if(v.includes("佐川"))return "佐川";
  return v;
}
function formatCurrency(v){
  return `¥${toNumber(v).toLocaleString("ja-JP")}`;
}
function getProductCode(p){
  return toStr(p?.["品番"] ?? p?.["商品コード"]);
}
function getProductName(p){
  return toStr(p?.["品名"] ?? p?.["商品名"]);
}
function includesKeyword(p,kw){
  const q=toStr(kw).toLowerCase();
  if(!q)return true;
  return getProductCode(p).toLowerCase().includes(q) ||
         getProductName(p).toLowerCase().includes(q);
}
function getRefTypeLabel(row){
  return row?.calcType==="weight"?"重量":"サイズ";
}
function getRefValue(row){
  if(!row)return 0;
  return row.calcType==="weight"
    ? toNumber(row.matchedWeight || row.referenceValue)
    : toNumber(row.matchedSize || row.referenceValue);
}

export default function App(){

  const [products,setProducts]=useState([]);
  const [carriers,setCarriers]=useState([]);
  const [carriersSeino,setCarriersSeino]=useState([]);
  const [carrierRegions,setCarrierRegions]=useState([]);

  const [keyword,setKeyword]=useState("");
  const [prefecture,setPrefecture]=useState("宮崎県");
  const [selectedProduct,setSelectedProduct]=useState(null);

  useEffect(()=>{
    (async()=>{
      const [p,c,s,r]=await Promise.all([
        loadCsvFn("/products.csv"),
        loadCsvFn("/carriers.csv"),
        loadCsvFn("/carriers_seino.csv"),
        loadCsvFn("/carrier_regions.csv"),
      ]);
      setProducts(p); setCarriers(c); setCarriersSeino(s); setCarrierRegions(r);
    })();
  },[]);

  const candidates = useMemo(()=>{
    return products
      .filter(p=>includesKeyword(p,keyword))
      .slice(0,100);
  },[products,keyword]);

  useEffect(()=>{
    if(candidates.length && !selectedProduct){
      setSelectedProduct(candidates[0]);
    }
  },[candidates]);

  const results = useMemo(()=>{
    if(!selectedProduct) return [];
    return buildFareResults({
      product:selectedProduct,
      prefecture,
      carrierRegions,
      carriers,
      carriersSeino
    });
  },[selectedProduct,prefecture]);

  const best = useMemo(()=>{
    if(!selectedProduct) return null;
    return findBestFare({
      product:selectedProduct,
      prefecture,
      carrierRegions,
      carriers,
      carriersSeino
    });
  },[selectedProduct,prefecture]);

  return (
    <div className="fare-app">
      <div className="page-wrap">

        <h1>運賃検索</h1>

        {/* 上段 */}
        <div className="top-grid">

          {/* 検索 */}
          <div className="panel">
            <div className="panel-body">
              <input
                value={keyword}
                onChange={e=>setKeyword(e.target.value)}
                placeholder="品番または品名"
              />
              <select
                value={prefecture}
                onChange={e=>setPrefecture(e.target.value)}
              >
                {PREFECTURES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* 候補 */}
          <div className="panel candidate-table-wrap">
            <table className="candidate-table">
              <tbody>
                {candidates.map(p=>{
                  const code=getProductCode(p);
                  return (
                    <tr key={code}
                        onClick={()=>setSelectedProduct(p)}
                        className={code===getProductCode(selectedProduct)?"active":""}>
                      <td>{code}</td>
                      <td>{getProductName(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 結果 */}
        <div className="panel">

          {/* 最安カード */}
          <div className="best-card">
            <div>最安候補</div>
            <div className="price">
              {best?formatCurrency(best.total):"-"}
            </div>
            <div>
              {best && normalizeCarrierName(best.carrier)}
            </div>
          </div>

          {/* テーブル */}
          <div className="result-table-wrap">
            <table className="result-table">
              <thead>
                <tr>
                  <th>運送会社</th>
                  <th>候補元</th>
                  <th>参照</th>
                  <th>参照値</th>
                  <th>地域</th>
                  <th>合計</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r=>(
                  <tr key={r.source}>
                    <td>{normalizeCarrierName(r.carrier)}</td>
                    <td>{r.source}</td>
                    <td>{getRefTypeLabel(r)}</td>
                    <td>{getRefValue(r)}</td>
                    <td>{r.region}</td>
                    <td>{formatCurrency(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
}
