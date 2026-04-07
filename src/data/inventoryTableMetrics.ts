import { buildPlannerRows } from "./promotionDemoMetrics";
import type { FutureWeekBaseline } from "./promotionDemoMetrics";
import { buildWeeklySalesForecastSeries } from "./weeklySalesSeries";
import type { SkuOption } from "./erpSkuCatalog";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function defaultFutureWeeks(): FutureWeekBaseline[] {
  return Array.from({ length: 9 }, (_, i) => ({
    weekLabel: `W+${i + 1}`,
    predicted: 88 + i * 5 + (i % 3) * 4,
  }));
}

export type StockBarLevel = "low" | "healthy" | "fast_decline";
export type InventoryRowStatus = "Critical" | "At risk" | "Healthy" | "Overstock";
export type InventoryAction =
  | "Order now"
  | "Suggested order"
  | "Sufficient"
  | "Review";

export interface InventoryTableRow {
  sku: string;
  productName: string;
  currentStock: number;
  stockBarPct: number;
  stockBarLevel: StockBarLevel;
  weeksUntilStockout: number;
  forecastDemandPromoAdjusted: number;
  leadTimeWeeks: number;
  orderQuantity: number;
  status: InventoryRowStatus;
  action: InventoryAction;
}

/** Sum over horizon of SKU weekly forecast × (with promo ÷ baseline) per week. */
export function totalPromoAdjustedDemand(
  sku: string,
  salesFutureBaselines: FutureWeekBaseline[],
  promotionPlanByWeek: Record<string, string[]>
): number {
  const weeks =
    salesFutureBaselines.length > 0
      ? salesFutureBaselines
      : defaultFutureWeeks();
  const plannerRows = buildPlannerRows(weeks, promotionPlanByWeek);
  const skuFuture = buildWeeklySalesForecastSeries(sku).filter((d) => d.isFuture);

  let sum = 0;
  for (const row of plannerRows) {
    const pt = skuFuture.find((s) => s.weekLabel === row.weekLabel);
    if (!pt) continue;
    const ratio =
      row.baselineUnits > 0 ? row.withPromoUnits / row.baselineUnits : 1;
    sum += pt.predicted * ratio;
  }
  return Math.round(sum);
}

function avgWeeklyDemand(totalHorizonDemand: number, numWeeks: number): number {
  if (numWeeks <= 0) return 0;
  return totalHorizonDemand / numWeeks;
}

/**
 * Demo mix for investors: rotate Critical / At risk / Healthy so a full
 * category (5 SKUs) shows red, yellow, and green rows. Single-SKU view uses
 * hash so the row still picks one of five profiles.
 */
function pickProfile(index: number, sku: string, rowCount: number): number {
  if (rowCount > 1) return index % 5;
  return hashString(sku) % 5;
}

export function buildInventoryTableRows(
  skus: SkuOption[],
  salesFutureBaselines: FutureWeekBaseline[],
  promotionPlanByWeek: Record<string, string[]>
): InventoryTableRow[] {
  const weeks =
    salesFutureBaselines.length > 0
      ? salesFutureBaselines
      : defaultFutureWeeks();
  const nWeeks = weeks.length;
  const rowCount = skus.length;

  return skus.map((item, index) => {
    const h = hashString(item.sku);
    const profile = pickProfile(index, item.sku, rowCount);

    const forecastTotal = totalPromoAdjustedDemand(
      item.sku,
      salesFutureBaselines,
      promotionPlanByWeek
    );
    const avgDemand = avgWeeklyDemand(forecastTotal, Math.max(1, nWeeks));

    const leadTimeWeeks = 2 + (h % 5);
    const targetCoverWeeks = 4;
    const targetStock = Math.max(avgDemand * targetCoverWeeks, 80);

    let currentStock: number;
    let stockBarLevel: StockBarLevel;
    let status: InventoryRowStatus;

    switch (profile) {
      case 0:
        status = "Critical";
        stockBarLevel = "low";
        currentStock = Math.max(18, Math.round(avgDemand * 1.35));
        break;
      case 1:
      case 3:
        status = "At risk";
        stockBarLevel = "fast_decline";
        currentStock = Math.round(avgDemand * 3.4);
        break;
      case 2:
      case 4:
      default:
        status = "Healthy";
        stockBarLevel = "healthy";
        currentStock = Math.round(avgDemand * (profile === 2 ? 8.2 : 7.6));
        break;
    }

    const weeksCover = avgDemand > 0.01 ? currentStock / avgDemand : 99;
    const weeksUntilStockout = Math.max(0, Math.round(weeksCover * 10) / 10);

    const stockBarPct = Math.min(
      100,
      Math.round((currentStock / Math.max(targetStock, 1)) * 100)
    );

    const pipelineNeed =
      avgDemand * leadTimeWeeks * 1.15 + avgDemand * 0.5;
    let orderQuantity = Math.max(0, Math.ceil(pipelineNeed - currentStock));

    let action: InventoryAction = "Sufficient";
    if (status === "Critical") {
      action = "Order now";
      orderQuantity = Math.max(orderQuantity, Math.ceil(avgDemand * 6));
    } else if (status === "At risk") {
      action = "Suggested order";
      orderQuantity = Math.max(orderQuantity, Math.ceil(avgDemand * 3));
    } else {
      action = "Sufficient";
      orderQuantity = Math.min(orderQuantity, Math.ceil(avgDemand * 2));
    }

    return {
      sku: item.sku,
      productName: item.name,
      currentStock,
      stockBarPct,
      stockBarLevel,
      weeksUntilStockout,
      forecastDemandPromoAdjusted: forecastTotal,
      leadTimeWeeks,
      orderQuantity,
      status,
      action,
    };
  });
}
