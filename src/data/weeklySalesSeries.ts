/**
 * Demo weekly sales series: plausible actuals + continuation forecast (not from DB).
 */

import { SKUS_BY_ERP_CATEGORY } from "./erpSkuCatalog";

export interface WeeklySalesPoint {
  weekIndex: number;
  weekLabel: string;
  actual: number | null;
  predicted: number;
  isFuture: boolean;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Past weeks of history + ~2 months (~9 weeks) of forecast horizon. */
const PAST_WEEKS = 14;
const FUTURE_WEEKS = 9;

type SupportedCategory = "Processed Food" | "Alcohol" | "Dairy" | "Unknown";

const SKU_TO_CATEGORY: Record<string, SupportedCategory> = (() => {
  const map: Record<string, SupportedCategory> = {};
  for (const [cat, opts] of Object.entries(SKUS_BY_ERP_CATEGORY)) {
    if (cat !== "Processed Food" && cat !== "Alcohol" && cat !== "Dairy") continue;
    for (const o of opts) map[o.sku] = cat as SupportedCategory;
  }
  return map;
})();

function seasonalMultiplier(
  category: SupportedCategory,
  weekLabel: string,
): number {
  if (category === "Unknown") return 1;

  const isGoodFridayWindow =
    weekLabel === "W-2" || weekLabel === "W-1" || weekLabel.startsWith("W0");
  const isHariRayaHajiWindow =
    weekLabel === "W+5" || weekLabel === "W+6" || weekLabel === "W+7";

  if (isGoodFridayWindow) {
    // Visible (but not absurd) spike in past/now weeks.
    if (category === "Alcohol") return 1.26;
    if (category === "Dairy") return 1.18;
    if (category === "Processed Food") return 1.22;
  }

  if (isHariRayaHajiWindow) {
    // Future seasonal lift: strong for Processed/Dairy, mild for Alcohol.
    if (category === "Processed Food") return 1.25;
    if (category === "Dairy") return 1.2;
    if (category === "Alcohol") return 1.07;
  }

  return 1;
}

export function buildWeeklySalesForecastSeries(sku: string): WeeklySalesPoint[] {
  const rnd = mulberry32(hashString(sku));
  const base = 80 + (hashString(sku) % 120);
  const series: WeeklySalesPoint[] = [];
  const category: SupportedCategory = SKU_TO_CATEGORY[sku] ?? "Unknown";

  let level = base + rnd() * 40;

  for (let i = -PAST_WEEKS; i < 0; i++) {
    const w = i + PAST_WEEKS;
    level = level * (0.96 + rnd() * 0.1) + (rnd() - 0.45) * 25;
    const actual = Math.max(12, Math.round(level));
    const predicted = Math.round(actual * (0.96 + rnd() * 0.08));
    const weekLabel = i === -1 ? "W-1" : `W${i}`;
    const mult = seasonalMultiplier(category, weekLabel);
    series.push({
      weekIndex: w,
      weekLabel,
      actual: Math.max(0, Math.round(actual * mult)),
      predicted: Math.max(0, Math.round(predicted * mult)),
      isFuture: false,
    });
  }

  {
    level = level * (0.98 + rnd() * 0.06) + (rnd() - 0.45) * 20;
    const actual = Math.max(12, Math.round(level));
    const predicted = Math.round(actual * (0.98 + rnd() * 0.05));
    const weekLabel = "W0 (now)";
    const mult = seasonalMultiplier(category, weekLabel);
    series.push({
      weekIndex: PAST_WEEKS,
      weekLabel,
      actual: Math.max(0, Math.round(actual * mult)),
      predicted: Math.max(0, Math.round(predicted * mult)),
      isFuture: false,
    });
  }

  let last = level;
  for (let j = 1; j <= FUTURE_WEEKS; j++) {
    last = last * (1 + (rnd() - 0.4) * 0.04) + (rnd() - 0.5) * 15;
    const predicted = Math.max(10, Math.round(last));
    const weekLabel = `W+${j}`;
    const mult = seasonalMultiplier(category, weekLabel);
    series.push({
      weekIndex: PAST_WEEKS + j,
      weekLabel,
      actual: null,
      predicted: Math.max(0, Math.round(predicted * mult)),
      isFuture: true,
    });
  }

  return series;
}

/**
 * Per-week mean actual and mean forecast across all SKUs in a category.
 * Week order and labels match `buildWeeklySalesForecastSeries` for each SKU.
 */
export function buildCategoryWeeklyAggregates(skus: string[]): WeeklySalesPoint[] {
  if (skus.length === 0) return [];
  const seriesList = skus.map((s) => buildWeeklySalesForecastSeries(s));
  const n = seriesList[0].length;
  const out: WeeklySalesPoint[] = [];
  for (let i = 0; i < n; i++) {
    const ref = seriesList[0][i];
    let sumActual = 0;
    let countActual = 0;
    let sumPredicted = 0;
    for (const ser of seriesList) {
      const p = ser[i];
      if (p.actual != null) {
        sumActual += p.actual;
        countActual += 1;
      }
      sumPredicted += p.predicted;
    }
    out.push({
      weekIndex: ref.weekIndex,
      weekLabel: ref.weekLabel,
      actual: countActual > 0 ? sumActual / countActual : null,
      predicted: sumPredicted / seriesList.length,
      isFuture: ref.isFuture,
    });
  }
  return out;
}

/** Row shape for Recharts: `sku_{j}_actual` / `sku_{j}_predicted` per selected SKU index. */
export type MultiSkuChartRow = {
  weekIndex: number;
  weekLabel: string;
  isFuture: boolean;
  categoryAvgActual: number | null;
  categoryAvgForecast: number;
} & Record<string, number | null | string | boolean | undefined>;

/**
 * Merge weekly series for several SKUs plus category aggregate columns (same week index).
 */
export function buildMultiSkuCategoryChartRows(
  selectedSkus: string[],
  categoryAvgSeries: WeeklySalesPoint[],
): MultiSkuChartRow[] {
  if (selectedSkus.length === 0) return [];
  const seriesPerSku = selectedSkus.map((s) => buildWeeklySalesForecastSeries(s));
  const n = seriesPerSku[0].length;
  const rows: MultiSkuChartRow[] = [];
  for (let i = 0; i < n; i++) {
    const cat = categoryAvgSeries[i];
    const row: MultiSkuChartRow = {
      weekIndex: seriesPerSku[0][i].weekIndex,
      weekLabel: seriesPerSku[0][i].weekLabel,
      isFuture: seriesPerSku[0][i].isFuture,
      categoryAvgActual: cat?.actual ?? null,
      categoryAvgForecast: cat?.predicted ?? 0,
    };
    selectedSkus.forEach((_, j) => {
      const p = seriesPerSku[j][i];
      // Use sku_${j}_* so lodash/recharts path lookup is never ambiguous vs nested keys.
      row[`sku_${j}_actual`] = p.actual;
      row[`sku_${j}_predicted`] = p.predicted;
    });
    rows.push(row);
  }
  return rows;
}

/** Four ISO-style weeks per “month” bucket for demo aggregation (24 weeks → 6 buckets). */
export const WEEKS_PER_MONTH_BUCKET = 4;

/** Chronological month buckets around “now” (M-0 contains W0). */
export const MONTH_BUCKET_LABELS: readonly string[] = [
  "M-3",
  "M-2",
  "M-1",
  "M-0 (now)",
  "M+1",
  "M+2",
];

export const MONTH_REF_LINE_LABEL = "M-0 (now)";

/**
 * Monthly **actual** total comparable across buckets: average weekly actual in
 * the slice × 4. Buckets that include future weeks (e.g. M-0 has W+1 with no
 * actual) would otherwise sum only 3 weeks and falsely dip vs 4-week sums.
 */
function monthEquivalentActualFromWeeklySlice(
  slice: MultiSkuChartRow[],
  getActual: (r: MultiSkuChartRow) => number | null | undefined,
): number | null {
  const vals = slice
    .map(getActual)
    .filter(
      (n): n is number =>
        n != null && typeof n === "number" && !Number.isNaN(n),
    );
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * WEEKS_PER_MONTH_BUCKET);
}

/**
 * Roll weekly chart rows into monthly totals.
 * - **Actual** (solid lines): mean weekly actual in bucket × 4 (month-equivalent).
 * - **Forecast** (dashed): sum of weekly forecast in bucket (every week has a forecast).
 * Expects 24 weekly points (14 past + W0 + 9 future) → 6 × 4 weeks.
 */
export function aggregateMultiSkuRowsToMonthly(
  rows: MultiSkuChartRow[],
  numSkuSlots: number,
): MultiSkuChartRow[] {
  if (rows.length === 0) return [];
  const out: MultiSkuChartRow[] = [];
  for (let b = 0; b < MONTH_BUCKET_LABELS.length; b++) {
    const start = b * WEEKS_PER_MONTH_BUCKET;
    const slice = rows.slice(start, start + WEEKS_PER_MONTH_BUCKET);
    if (slice.length === 0) break;
    const label = MONTH_BUCKET_LABELS[b] ?? `M${b}`;
    const row: MultiSkuChartRow = {
      weekIndex: b,
      weekLabel: label,
      isFuture: slice.every((r) => r.isFuture),
      categoryAvgActual: monthEquivalentActualFromWeeklySlice(
        slice,
        (r) => r.categoryAvgActual,
      ),
      categoryAvgForecast: slice.reduce(
        (s, r) => s + (r.categoryAvgForecast ?? 0),
        0,
      ),
    };
    for (let j = 0; j < numSkuSlots; j++) {
      const actKey = `sku_${j}_actual`;
      const fcstKey = `sku_${j}_predicted`;
      row[actKey] = monthEquivalentActualFromWeeklySlice(slice, (r) => {
        const v = r[actKey];
        return typeof v === "number" ? v : null;
      });
      row[fcstKey] = slice.reduce(
        (s, r) => s + (Number(r[fcstKey]) || 0),
        0,
      );
    }
    out.push(row);
  }
  return out;
}
