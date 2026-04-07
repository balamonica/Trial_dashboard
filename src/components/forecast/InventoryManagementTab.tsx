import { useEffect, useMemo, useRef, useState } from "react";
import { useForecastPromotion } from "../../context/ForecastPromotionContext";
import {
  CATEGORIES_WITH_SKU_DATA,
  ERP_CATEGORY_DROPDOWN_ORDER,
  SKUS_BY_ERP_CATEGORY,
  type SkuOption,
} from "../../data/erpSkuCatalog";
import { buildPerishableExpiryRows } from "../../data/perishableExpiryMetrics";
import {
  buildInventoryTableRows,
  type StockBarLevel,
} from "../../data/inventoryTableMetrics";

/** Short-life / chilled-style categories where expiry-driven waste makes sense. Spirits typically don’t. */
const CATEGORIES_WITH_EXPIRY_WASTE_VIEW = new Set([
  "Processed Food",
  "Dairy",
]);

function stockBarClass(level: StockBarLevel): string {
  if (level === "low") return "inv-stock-fill inv-stock-fill--low";
  if (level === "fast_decline") return "inv-stock-fill inv-stock-fill--warn";
  return "inv-stock-fill inv-stock-fill--ok";
}

function statusClass(status: string): string {
  if (status === "Critical") return "inv-status inv-status--critical";
  if (status === "At risk") return "inv-status inv-status--risk";
  if (status === "Overstock") return "inv-status inv-status--over";
  return "inv-status inv-status--ok";
}

export function InventoryManagementTab() {
  const {
    promotionPlanByWeek,
    salesFutureBaselines,
    resetPromotionPlan,
  } = useForecastPromotion();
  const [category, setCategory] = useState<string>("Processed Food");
  const [skuFilter, setSkuFilter] = useState<string>("");

  const skuOptions: SkuOption[] = useMemo(() => {
    if (!CATEGORIES_WITH_SKU_DATA.has(category)) return [];
    return SKUS_BY_ERP_CATEGORY[category] ?? [];
  }, [category]);

  useEffect(() => {
    if (skuOptions.length === 0) {
      setSkuFilter("");
      return;
    }
    if (skuFilter && !skuOptions.some((o) => o.sku === skuFilter)) {
      setSkuFilter("");
    }
  }, [category, skuOptions, skuFilter]);

  const prevCategoryRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevCategoryRef.current === null) {
      prevCategoryRef.current = category;
      return;
    }
    if (prevCategoryRef.current !== category) {
      prevCategoryRef.current = category;
      resetPromotionPlan();
    }
  }, [category, resetPromotionPlan]);

  const skusForTable = useMemo(() => {
    if (skuOptions.length === 0) return [];
    if (!skuFilter) return skuOptions;
    return skuOptions.filter((o) => o.sku === skuFilter);
  }, [skuOptions, skuFilter]);

  const rows = useMemo(
    () =>
      buildInventoryTableRows(
        skusForTable,
        salesFutureBaselines,
        promotionPlanByWeek
      ),
    [skusForTable, salesFutureBaselines, promotionPlanByWeek]
  );

  const perishableRows = useMemo(() => {
    if (!CATEGORIES_WITH_EXPIRY_WASTE_VIEW.has(category)) return [];
    return buildPerishableExpiryRows(
      skusForTable,
      salesFutureBaselines,
      promotionPlanByWeek,
      rows
    );
  }, [
    category,
    skusForTable,
    salesFutureBaselines,
    promotionPlanByWeek,
    rows,
  ]);

  return (
    <section className="section">
      <div className="forecast-filters">
        <label className="forecast-field">
          <span>Category</span>
          <select
            className="forecast-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {ERP_CATEGORY_DROPDOWN_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="forecast-field">
          <span>SKU</span>
          <select
            className="forecast-select"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            disabled={skuOptions.length === 0}
          >
            <option value="">All SKUs in category</option>
            {skuOptions.map((o) => (
              <option key={o.sku} value={o.sku}>
                {o.sku} — {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {skuOptions.length === 0 ? (
        <div className="forecast-empty card" style={{ marginTop: 16 }}>
          <p>No SKU catalog for this category in the demo.</p>
        </div>
      ) : (
        <div className="card inv-table-card" style={{ marginTop: 16 }}>
          <div className="inv-table-scroll">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Current stock</th>
                  <th>Est. depletion</th>
                  <th>Forecast demand</th>
                  <th>Lead time</th>
                  <th>Order qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.sku}>
                    <td className="inv-mono">{r.sku}</td>
                    <td>{r.productName}</td>
                    <td>
                      <div className="inv-stock-wrap">
                        <span className="inv-stock-num">
                          {r.currentStock.toLocaleString()}
                        </span>
                        <div className="inv-stock-track">
                          <div
                            className={stockBarClass(r.stockBarLevel)}
                            style={{ width: `${Math.min(100, r.stockBarPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{r.weeksUntilStockout} wk</td>
                    <td>{r.forecastDemandPromoAdjusted.toLocaleString()}</td>
                    <td>{r.leadTimeWeeks} wk</td>
                    <td>{r.orderQuantity.toLocaleString()}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
                    <td className="inv-action">{r.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="inv-table-footnote">
            Forecast demand uses the weekly outlook per SKU and the promotion
            weeks from <strong>Sales and demand forecast</strong>.
          </p>
        </div>
      )}

      {skuOptions.length > 0 && CATEGORIES_WITH_EXPIRY_WASTE_VIEW.has(category) && (
        <div className="card inv-table-card inv-perishable-card" style={{ marginTop: 24 }}>
          <div className="inv-perishable-header">
            <h3 className="inv-perishable-title">
              Perishable expiry &amp; waste risk
            </h3>
          </div>
          <div className="inv-table-scroll">
            <table className="inv-table inv-perishable-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Next expiry</th>
                  <th>Days left</th>
                  <th>On hand</th>
                  <th>Forecast use before expiry</th>
                  <th>At-risk (est. waste)</th>
                  <th>Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {perishableRows.map((p) => (
                  <tr key={p.sku}>
                    <td className="inv-mono">{p.sku}</td>
                    <td>{p.productName}</td>
                    <td>{p.nextExpiryLabel}</td>
                    <td>{p.daysToExpiry}</td>
                    <td>{p.onHand.toLocaleString()}</td>
                    <td>{p.forecastUseBeforeExpiry.toLocaleString()}</td>
                    <td>
                      <span
                        className={
                          p.atRiskUnits > 0
                            ? "inv-at-risk inv-at-risk--yes"
                            : "inv-at-risk inv-at-risk--no"
                        }
                      >
                        {p.atRiskUnits.toLocaleString()}
                      </span>
                    </td>
                    <td className="inv-perishable-suggestion">{p.suggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="inv-table-footnote">
            Estimate — assumes the forecast holds and the next expiry applies to
            this stock. Plan promotions in{" "}
            <strong>Sales and demand forecast</strong> to lift sell-through.
          </p>
        </div>
      )}

      {skuOptions.length > 0 && category === "Alcohol" && (
        <p className="inv-alcohol-note">
          Expiry-based waste isn’t shown for alcohol: spirits have long stable
          shelf life; beer/wine may use best-before for quality, not short
          perishable windows like chilled goods. Use the inventory table above.
        </p>
      )}
    </section>
  );
}
