import { useEffect, useMemo, useRef, useState } from "react";
import { useForecastPromotion } from "../../context/ForecastPromotionContext";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORIES_WITH_SKU_DATA,
  ERP_CATEGORY_DROPDOWN_ORDER,
  SKUS_BY_ERP_CATEGORY,
  type SkuOption,
} from "../../data/erpSkuCatalog";
import {
  aggregateMultiSkuRowsToMonthly,
  buildCategoryWeeklyAggregates,
  buildMultiSkuCategoryChartRows,
  buildWeeklySalesForecastSeries,
  MONTH_REF_LINE_LABEL,
} from "../../data/weeklySalesSeries";
import type { FutureWeekBaseline } from "../../data/promotionDemoMetrics";
import { PromotionEffectivenessSection } from "./PromotionEffectivenessSection";
import { RiskIndicationBanners } from "./RiskIndicationBanners";

/** Category average: dominant red so it reads as the primary reference. */
const COLORS = {
  categoryAvgActual: "#c41e3a",
  categoryAvgForecast: "#f87171",
  slate: "#64748b",
  grid: "#e2e8f0",
};

/** Subtle pastel pairs for per-SKU lines (actual slightly deeper than forecast). */
const SKU_PALETTE = [
  { actual: "#7eb0d4", forecast: "#b8d4ea" },
  { actual: "#8fc4a8", forecast: "#c5e0d0" },
  { actual: "#b8a8d4", forecast: "#d8cce8" },
  { actual: "#d4b896", forecast: "#e8d8c4" },
  { actual: "#9eb0c8", forecast: "#c8d4e4" },
];

function skuDropdownSummary(
  selected: string[],
  options: SkuOption[],
): string {
  if (selected.length === 0) return "Select SKUs…";
  if (selected.length === 1) {
    const o = options.find((x) => x.sku === selected[0]);
    return o ? `${o.sku} — ${o.name}` : selected[0];
  }
  return `${selected.length} SKUs selected`;
}

export function SalesDemandForecastTab() {
  const {
    setSalesFutureBaselines,
    setSalesReferenceSku,
    resetPromotionPlan,
  } = useForecastPromotion();
  const [category, setCategory] = useState<string>("Processed Food");
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [skuMenuOpen, setSkuMenuOpen] = useState(false);
  const skuMenuRef = useRef<HTMLDivElement>(null);
  const [salesGranularity, setSalesGranularity] = useState<
    "weekly" | "monthly"
  >("weekly");

  const skuOptions: SkuOption[] = useMemo(() => {
    if (!CATEGORIES_WITH_SKU_DATA.has(category)) return [];
    return SKUS_BY_ERP_CATEGORY[category] ?? [];
  }, [category]);

  useEffect(() => {
    setSkuMenuOpen(false);
    if (skuOptions.length === 0) {
      setSelectedSkus([]);
      return;
    }
    setSelectedSkus((prev) => {
      const valid = prev.filter((s) => skuOptions.some((o) => o.sku === s));
      if (valid.length > 0) return valid;
      return [skuOptions[0].sku];
    });
  }, [category, skuOptions]);

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

  /** Full category mean (all SKUs in the category), always — not the mean of the selection. */
  const categoryAvgSeries = useMemo(() => {
    if (skuOptions.length === 0) return [];
    return buildCategoryWeeklyAggregates(skuOptions.map((o) => o.sku));
  }, [skuOptions]);

  const chartDataWithCategoryAvg = useMemo(() => {
    if (selectedSkus.length === 0 || !categoryAvgSeries.length) return [];
    return buildMultiSkuCategoryChartRows(selectedSkus, categoryAvgSeries);
  }, [selectedSkus, categoryAvgSeries]);

  const chartDataForDisplay = useMemo(() => {
    if (chartDataWithCategoryAvg.length === 0) return [];
    if (salesGranularity === "monthly") {
      return aggregateMultiSkuRowsToMonthly(
        chartDataWithCategoryAvg,
        selectedSkus.length,
      );
    }
    return chartDataWithCategoryAvg;
  }, [salesGranularity, chartDataWithCategoryAvg, selectedSkus.length]);

  const nowLabel = useMemo(
    () =>
      chartDataWithCategoryAvg.find((d) => d.weekLabel.startsWith("W0"))
        ?.weekLabel ?? "W0 (now)",
    [chartDataWithCategoryAvg],
  );

  const refLineX =
    salesGranularity === "monthly" ? MONTH_REF_LINE_LABEL : nowLabel;

  const firstSkuName =
    skuOptions.find((o) => o.sku === selectedSkus[0])?.name ?? "";

  const futureBaselinesForPromo: FutureWeekBaseline[] = useMemo(() => {
    if (!selectedSkus[0]) return [];
    const one = buildWeeklySalesForecastSeries(selectedSkus[0]);
    return one
      .filter((d) => d.isFuture)
      .map((d) => ({ weekLabel: d.weekLabel, predicted: d.predicted }));
  }, [selectedSkus]);

  useEffect(() => {
    setSalesFutureBaselines(futureBaselinesForPromo);
    setSalesReferenceSku(selectedSkus[0] ?? null);
  }, [futureBaselinesForPromo, selectedSkus, setSalesFutureBaselines, setSalesReferenceSku]);

  const toggleSku = (sku: string) => {
    setSelectedSkus((prev) => {
      const has = prev.includes(sku);
      if (has) {
        const next = prev.filter((s) => s !== sku);
        if (next.length === 0 && skuOptions[0]) return [skuOptions[0].sku];
        return next;
      }
      return [...prev, sku];
    });
  };

  useEffect(() => {
    if (!skuMenuOpen) return;
    const onDocMouse = (e: MouseEvent) => {
      if (
        skuMenuRef.current &&
        !skuMenuRef.current.contains(e.target as Node)
      ) {
        setSkuMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSkuMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [skuMenuOpen]);

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
        <div
          className="forecast-field forecast-field--sku-multi"
          ref={skuMenuRef}
        >
          <span id="sku-dd-label">SKU</span>
          <div className="sku-dd">
            <button
              type="button"
              className={`sku-dd__trigger forecast-select${skuMenuOpen ? " sku-dd__trigger--open" : ""}`}
              id="sku-dd-button"
              aria-haspopup="listbox"
              aria-expanded={skuMenuOpen}
              aria-labelledby="sku-dd-label sku-dd-button"
              disabled={skuOptions.length === 0}
              onClick={() => setSkuMenuOpen((o) => !o)}
            >
              <span className="sku-dd__trigger-text">
                {skuOptions.length === 0
                  ? "No SKUs in this category"
                  : skuDropdownSummary(selectedSkus, skuOptions)}
              </span>
            </button>
            {skuMenuOpen && skuOptions.length > 0 && (
              <div
                className="sku-dd__panel"
                role="listbox"
                aria-labelledby="sku-dd-label"
                aria-multiselectable="true"
              >
                {skuOptions.map((o) => {
                  const checked = selectedSkus.includes(o.sku);
                  return (
                    <div
                      key={o.sku}
                      role="option"
                      tabIndex={0}
                      aria-selected={checked}
                      className={`sku-dd__row${checked ? " sku-dd__row--on" : ""}`}
                      onClick={() => toggleSku(o.sku)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSku(o.sku);
                        }
                      }}
                    >
                      <span className="sku-dd__tick" aria-hidden>
                        {checked ? "✓" : ""}
                      </span>
                      <span className="sku-dd__row-text">
                        <span className="sku-dd__sku">{o.sku}</span>
                        <span className="sku-dd__name">{o.name}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSkus.length > 0 && chartDataWithCategoryAvg.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="sales-risk-row" aria-label="Risk indications">
            <RiskIndicationBanners
              category={category}
              sku={selectedSkus[0]}
              skuName={firstSkuName}
            />
          </div>
          <div className="card-header">
            <div>
              <h3 className="card-title">Sales — actual vs forecast</h3>
              <p className="card-sub">
                <strong>
                  {selectedSkus.length === 1
                    ? selectedSkus[0]
                    : `${selectedSkus.length} SKUs`}
                </strong>
                {selectedSkus.length === 1 && firstSkuName
                  ? ` · ${firstSkuName}`
                  : selectedSkus.length > 1
                    ? ` · ${selectedSkus.join(", ")}`
                    : ""}
                {salesGranularity === "monthly"
                  ? " · Monthly totals (sum of weekly units per bucket)"
                  : " · Weekly units"}
              </p>
            </div>
            <div
              className="sales-gran-toggle"
              role="group"
              aria-label="Sales chart granularity"
            >
              <button
                type="button"
                className={`sales-gran-toggle__btn${salesGranularity === "weekly" ? " active" : ""}`}
                onClick={() => setSalesGranularity("weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`sales-gran-toggle__btn${salesGranularity === "monthly" ? " active" : ""}`}
                onClick={() => setSalesGranularity("monthly")}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="chart-wrap chart-wrap--wide">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartDataForDisplay}
                margin={{ top: 16, right: 20, left: 8, bottom: 44 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 10, fill: COLORS.slate }}
                  interval={0}
                  angle={salesGranularity === "monthly" ? -15 : -30}
                  textAnchor="end"
                  height={salesGranularity === "monthly" ? 56 : 72}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: COLORS.slate }}
                  domain={["auto", "auto"]}
                  label={{
                    value:
                      salesGranularity === "monthly"
                        ? "Units (monthly total)"
                        : "Units sold (weekly)",
                    angle: -90,
                    position: "insideLeft",
                    dy: 18,
                    fill: COLORS.slate,
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value) => {
                    if (value == null || typeof value !== "number")
                      return ["—", ""];
                    return [Math.round(value), ""];
                  }}
                />
                <ReferenceLine
                  x={refLineX}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: "Now",
                    position: "top",
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />
                {salesGranularity === "weekly" && (
                  <ReferenceArea
                    x1="W-2"
                    x2={nowLabel}
                    fill="#fde68a"
                    fillOpacity={0.35}
                    strokeOpacity={0}
                    label={{
                      value: "Good Friday",
                      position: "top",
                      fill: "#7c2d12",
                      fontSize: 11,
                    }}
                  />
                )}
                {salesGranularity === "weekly" && (
                  <ReferenceArea
                    x1="W+5"
                    x2="W+7"
                    fill="#bfdbfe"
                    fillOpacity={0.35}
                    strokeOpacity={0}
                    label={{
                      value: "Hari Raya Haji",
                      position: "top",
                      fill: "#1e3a8a",
                      fontSize: 11,
                    }}
                  />
                )}
                {/* Group 1: category average. Groups 2..n: selected SKUs in order (Recharts paints later lines on top). */}
                <Line
                  type="linear"
                  dataKey="categoryAvgActual"
                  name="1 · Category · actual"
                  stroke={COLORS.categoryAvgActual}
                  strokeWidth={3}
                  strokeOpacity={1}
                  dot={{ r: 2.5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="categoryAvgForecast"
                  name="1 · Category · forecast"
                  stroke={COLORS.categoryAvgForecast}
                  strokeWidth={2.75}
                  strokeOpacity={1}
                  dot={{ r: 2 }}
                  strokeDasharray="6 4"
                  isAnimationActive={false}
                />
                {/* Per-SKU lines must be direct children of LineChart — Recharts findAllByType does not recurse into Fragment, so those series were never registered. */}
                {selectedSkus.flatMap((skuId, j) => {
                  const pal = SKU_PALETTE[j % SKU_PALETTE.length];
                  const actKey = `sku_${j}_actual`;
                  const fcstKey = `sku_${j}_predicted`;
                  const groupNum = j + 2;
                  return [
                    <Line
                      key={`${skuId}-actual`}
                      type="linear"
                      dataKey={actKey}
                      name={`${groupNum} · SKU ${j + 1} (${skuId}) · actual`}
                      stroke={pal.actual}
                      strokeWidth={2.25}
                      strokeOpacity={0.92}
                      dot={{ r: 2.5 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />,
                    <Line
                      key={`${skuId}-forecast`}
                      type="linear"
                      dataKey={fcstKey}
                      name={`${groupNum} · SKU ${j + 1} (${skuId}) · forecast`}
                      stroke={pal.forecast}
                      strokeWidth={1.85}
                      strokeOpacity={0.9}
                      dot={{ r: 2 }}
                      strokeDasharray="6 4"
                      isAnimationActive={false}
                    />,
                  ];
                })}
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: 10,
                    lineHeight: 1.35,
                    paddingTop: 4,
                  }}
                  iconType="line"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {skuOptions.length === 0 && (
        <div className="forecast-empty card" style={{ marginTop: 16 }}>
          <p>
            This category is listed for navigation. Connect historical orders
            to enable SKU-level forecasts here.
          </p>
        </div>
      )}

      <PromotionEffectivenessSection
        category={category}
        futureBaselines={futureBaselinesForPromo}
      />
    </section>
  );
}
