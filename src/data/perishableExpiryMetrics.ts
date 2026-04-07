import { buildPlannerRows } from "./promotionDemoMetrics";
import type { FutureWeekBaseline } from "./promotionDemoMetrics";
import { buildWeeklySalesForecastSeries } from "./weeklySalesSeries";
import type { SkuOption } from "./erpSkuCatalog";
import type { InventoryTableRow } from "./inventoryTableMetrics";

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

/**
 * Cumulative forecast units (promo-adjusted by week) for the first `days` calendar days
 * of the forward horizon, prorating partial weeks.
 */
export function forecastDemandBeforeDays(
  sku: string,
  days: number,
  salesFutureBaselines: FutureWeekBaseline[],
  promotionPlanByWeek: Record<string, string[]>
): number {
  const weeks =
    salesFutureBaselines.length > 0
      ? salesFutureBaselines
      : defaultFutureWeeks();
  const plannerRows = buildPlannerRows(weeks, promotionPlanByWeek);
  const skuFuture = buildWeeklySalesForecastSeries(sku).filter((d) => d.isFuture);

  let remaining = Math.max(0, days);
  let sum = 0;
  for (const row of plannerRows) {
    if (remaining <= 0) break;
    const pt = skuFuture.find((s) => s.weekLabel === row.weekLabel);
    if (!pt) continue;
    const ratio =
      row.baselineUnits > 0 ? row.withPromoUnits / row.baselineUnits : 1;
    const weeklyUnits = pt.predicted * ratio;
    const take = Math.min(7, remaining);
    sum += weeklyUnits * (take / 7);
    remaining -= take;
  }
  return Math.round(sum);
}

/** Days until the next (earliest) expiry for this SKU — demo only (no DB lot). */
export function daysToNextExpiryDemo(sku: string): number {
  return 12 + (hashString(sku) % 44);
}

export interface PerishableExpiryRow {
  sku: string;
  productName: string;
  nextExpiryLabel: string;
  daysToExpiry: number;
  onHand: number;
  forecastUseBeforeExpiry: number;
  atRiskUnits: number;
  suggestion: string;
}

function formatExpiryDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildSuggestion(
  atRisk: number,
  daysToExpiry: number,
  nextExpiryLabel: string
): string {
  if (atRisk <= 0) {
    return "Forecast demand likely clears stock before expiry.";
  }
  if (daysToExpiry <= 14 && atRisk > 15) {
    return `Plan promotion before ${nextExpiryLabel} — high waste risk.`;
  }
  if (atRisk > 10 || daysToExpiry <= 21) {
    return `Consider a promotion or markdown before ${nextExpiryLabel}.`;
  }
  return `Monitor — ~${atRisk} units may remain at expiry; plan sell-through.`;
}

export function buildPerishableExpiryRows(
  skus: SkuOption[],
  salesFutureBaselines: FutureWeekBaseline[],
  promotionPlanByWeek: Record<string, string[]>,
  inventoryRows: InventoryTableRow[]
): PerishableExpiryRow[] {
  const stockBySku = new Map(
    inventoryRows.map((r) => [r.sku, r.currentStock])
  );

  return skus.map((item) => {
    const daysToExpiry = daysToNextExpiryDemo(item.sku);
    const nextExpiryLabel = formatExpiryDate(daysToExpiry);
    const onHand =
      stockBySku.get(item.sku) ?? 100 + (hashString(item.sku) % 220);

    const forecastUseBeforeExpiry = forecastDemandBeforeDays(
      item.sku,
      daysToExpiry,
      salesFutureBaselines,
      promotionPlanByWeek
    );

    const atRiskUnits = Math.max(0, onHand - forecastUseBeforeExpiry);

    return {
      sku: item.sku,
      productName: item.name,
      nextExpiryLabel,
      daysToExpiry,
      onHand,
      forecastUseBeforeExpiry,
      atRiskUnits,
      suggestion: buildSuggestion(
        atRiskUnits,
        daysToExpiry,
        nextExpiryLabel
      ),
    };
  });
}
