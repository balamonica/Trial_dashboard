import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useForecastPromotion } from "../../context/ForecastPromotionContext";
import { getPromotionNamesForUi } from "../../data/erpPromotions";
import {
  buildPlannerRows,
  buildPromotionEffectivenessRows,
  buildWhatIfWeeklySeries,
  type FutureWeekBaseline,
} from "../../data/promotionDemoMetrics";

const COLORS = {
  teal: "#0d9488",
  slate: "#64748b",
  blue: "#2b6cb0",
  grid: "#e2e8f0",
};

function defaultFutureWeeks(): FutureWeekBaseline[] {
  return Array.from({ length: 9 }, (_, i) => ({
    weekLabel: `W+${i + 1}`,
    predicted: 88 + i * 5 + (i % 3) * 4,
  }));
}

function promoDropdownSummary(selected: string[]): string {
  if (selected.length === 0) return "Select promotions…";
  if (selected.length === 1) return selected[0];
  return `${selected.length} promotions selected`;
}

interface PromotionEffectivenessSectionProps {
  /** Future weekly baseline units (from SKU forecast). If empty, uses a neutral demo series. */
  futureBaselines: FutureWeekBaseline[];
  /** ERP category — drives which demo promotions appear in the planner. */
  category: string;
}

export function PromotionEffectivenessSection({
  futureBaselines,
  category,
}: PromotionEffectivenessSectionProps) {
  const { promotionPlanByWeek, togglePromotionForWeek } =
    useForecastPromotion();
  const [openPromoWeek, setOpenPromoWeek] = useState<string | null>(null);
  const promoMenuRef = useRef<HTMLDivElement>(null);

  const promotionNames = useMemo(
    () => getPromotionNamesForUi(category),
    [category]
  );

  const effectivenessRows = useMemo(
    () => buildPromotionEffectivenessRows(promotionNames),
    [promotionNames]
  );

  const weeks = useMemo(
    () =>
      futureBaselines.length > 0 ? futureBaselines : defaultFutureWeeks(),
    [futureBaselines]
  );

  const plannerRows = useMemo(
    () => buildPlannerRows(weeks, promotionPlanByWeek),
    [weeks, promotionPlanByWeek]
  );

  const whatIfSeries = useMemo(
    () => buildWhatIfWeeklySeries(plannerRows),
    [plannerRows]
  );

  const totalIncremental = useMemo(
    () => plannerRows.reduce((s, r) => s + r.incrementalUnits, 0),
    [plannerRows]
  );

  useEffect(() => {
    if (!openPromoWeek) return;
    const onDocMouse = (e: MouseEvent) => {
      if (
        promoMenuRef.current &&
        !promoMenuRef.current.contains(e.target as Node)
      ) {
        setOpenPromoWeek(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPromoWeek(null);
    };
    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPromoWeek]);

  return (
    <div className="promo-section">
      <h3 className="section-title" style={{ marginTop: 28 }}>
        Promotion effectiveness &amp; planning
      </h3>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Historical promotion effectiveness</h3>
              <p className="card-sub">
                Estimated incremental lift % (model vs non-promo weeks) by
                campaign.
              </p>
            </div>
          </div>
          <div className="chart-wrap chart-wrap--promo-eff">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={effectivenessRows}
                margin={{ top: 8, right: 8, left: 4, bottom: 56 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 9, fill: COLORS.slate }}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={78}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: COLORS.slate }}
                  label={{
                    value: "Lift %",
                    angle: -90,
                    position: "insideLeft",
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
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as {
                      promotionName: string;
                      liftPct: number;
                    };
                    return (
                      <div
                        style={{
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{row.promotionName}</div>
                        <div>Est. lift: {row.liftPct}%</div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar
                  dataKey="liftPct"
                  name="Est. lift %"
                  fill={COLORS.teal}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Upcoming weeks — what-if sales</h3>
              <p className="card-sub">
                Baseline forecast vs units if you attach planned promotions
                each week (combined uplift is the sum of selected campaigns,
                capped at 100%).
              </p>
            </div>
          </div>
          <div className="chart-wrap chart-wrap--promo-eff">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={whatIfSeries}
                margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: COLORS.slate }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: COLORS.slate }}
                  label={{
                    value: "Units / week",
                    angle: -90,
                    position: "insideLeft",
                    fill: COLORS.slate,
                    fontSize: 11,
                  }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="baseline"
                  name="Without promotion"
                  fill={COLORS.slate}
                  opacity={0.45}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="withPromotions"
                  name="With planned promos"
                  stroke={COLORS.blue}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="promo-total-inline">
            Sum of incremental units (planned weeks):{" "}
            <strong>{totalIncremental.toLocaleString()}</strong>
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Plan promotions by week</h3>
            <p className="card-sub">
              Choose one or more campaigns per week. Est. uplift is the sum of
              each campaign&apos;s lift (max 100%).
            </p>
          </div>
        </div>
        <div className="promo-planner-wrap">
          <table className="promo-planner-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Planned promotions</th>
                <th>Est. uplift</th>
                <th>Incremental units</th>
                <th>Total w/ promo</th>
              </tr>
            </thead>
            <tbody>
              {plannerRows.map((row) => {
                const selected = row.selectedPromotions;
                const isOpen = openPromoWeek === row.weekLabel;
                return (
                  <tr key={row.weekLabel}>
                    <td>{row.weekLabel}</td>
                    <td>
                      <div
                        className="forecast-field forecast-field--sku-multi forecast-field--promo-cell"
                        ref={isOpen ? promoMenuRef : undefined}
                      >
                        <div className="sku-dd">
                          <button
                            type="button"
                            className={`sku-dd__trigger forecast-select${isOpen ? " sku-dd__trigger--open" : ""}`}
                            aria-haspopup="listbox"
                            aria-expanded={isOpen}
                            disabled={promotionNames.length === 0}
                            onClick={() =>
                              setOpenPromoWeek((w) =>
                                w === row.weekLabel ? null : row.weekLabel
                              )
                            }
                          >
                            <span className="sku-dd__trigger-text">
                              {promotionNames.length === 0
                                ? "No promotions"
                                : promoDropdownSummary(selected)}
                            </span>
                          </button>
                          {isOpen && promotionNames.length > 0 && (
                            <div
                              className="sku-dd__panel"
                              role="listbox"
                              aria-multiselectable="true"
                            >
                              {promotionNames.map((n) => {
                                const checked = selected.includes(n);
                                return (
                                  <div
                                    key={n}
                                    role="option"
                                    tabIndex={0}
                                    aria-selected={checked}
                                    className={`sku-dd__row${checked ? " sku-dd__row--on" : ""}`}
                                    onClick={() =>
                                      togglePromotionForWeek(row.weekLabel, n)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        togglePromotionForWeek(
                                          row.weekLabel,
                                          n
                                        );
                                      }
                                    }}
                                  >
                                    <span className="sku-dd__tick" aria-hidden>
                                      {checked ? "✓" : ""}
                                    </span>
                                    <span className="sku-dd__row-text">
                                      <span className="sku-dd__name">{n}</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {selected.length > 0 ? `${row.upliftPct}%` : "—"}
                    </td>
                    <td>
                      {selected.length > 0
                        ? row.incrementalUnits.toLocaleString()
                        : "—"}
                    </td>
                    <td>{row.withPromoUnits.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
