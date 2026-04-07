function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Simulated historical effectiveness: incremental sales lift % vs non-promo weeks (model). */
export interface PromotionEffectivenessRow {
  shortLabel: string;
  promotionName: string;
  liftPct: number;
  incrementalUnitsProxy: number;
}

/** Fixed lift % for named demo campaigns (otherwise hash-based). Keys must match `erpPromotions` labels. */
const PROMOTION_LIFT_OVERRIDES: Readonly<Record<string, number>> = {
  "Bar corridor discount": 25,
  "Foodservice bulk tier": 22,
  "Frozen bundle multi-buy": 25,
  "School milk program": 30,
  "Weekend flash (frozen)": 32,
  "Wine list partner promo": 18,
};

/**
 * Single lift % from a promotion name (historical bar + planner use the same value).
 */
export function promotionLiftPctFromName(promotionName: string): number {
  if (!promotionName) return 0;
  const overridden = PROMOTION_LIFT_OVERRIDES[promotionName];
  if (overridden !== undefined) return overridden;
  const h = hashString(promotionName);
  const liftPct = 6 + (h % 19) + (h % 7) * 0.3;
  return Math.round(liftPct * 10) / 10;
}

export function buildPromotionEffectivenessRows(
  promotionNames: string[]
): PromotionEffectivenessRow[] {
  return promotionNames.map((promotionName) => {
    const h = hashString(promotionName);
    const liftPct = promotionLiftPctFromName(promotionName);
    const incrementalUnitsProxy = 80 + (h % 140);
    const shortLabel =
      promotionName.length > 28
        ? `${promotionName.slice(0, 26)}…`
        : promotionName;
    return {
      shortLabel,
      promotionName,
      liftPct,
      incrementalUnitsProxy,
    };
  });
}

export interface FutureWeekBaseline {
  weekLabel: string;
  predicted: number;
}

/** Uplift % when a named promotion is applied (same formula as historical effectiveness). */
export function estimatedUpliftPct(promotionName: string): number {
  return promotionLiftPctFromName(promotionName);
}

/**
 * Combined uplift for multiple planned promotions: sum of per-campaign lift %,
 * capped at 100% (historical single-campaign lifts summed for planning).
 */
export function combinedUpliftPct(promotionNames: string[]): number {
  if (!promotionNames.length) return 0;
  const sum = promotionNames.reduce(
    (s, n) => s + promotionLiftPctFromName(n),
    0
  );
  return Math.min(100, Math.round(sum * 10) / 10);
}

export interface PlannerWeekRow {
  weekLabel: string;
  baselineUnits: number;
  selectedPromotions: string[];
  upliftPct: number;
  incrementalUnits: number;
  withPromoUnits: number;
}

export function buildPlannerRows(
  futureBaselines: FutureWeekBaseline[],
  plannedPromotionByWeek: Record<string, string[]>
): PlannerWeekRow[] {
  return futureBaselines.map(({ weekLabel, predicted }) => {
    const selectedPromotions = plannedPromotionByWeek[weekLabel] ?? [];
    const upliftPct = combinedUpliftPct(selectedPromotions);
    const baselineUnits = Math.round(predicted);
    const incrementalUnits = Math.round(
      (baselineUnits * upliftPct) / 100
    );
    const withPromoUnits = baselineUnits + incrementalUnits;
    return {
      weekLabel,
      baselineUnits,
      selectedPromotions,
      upliftPct,
      incrementalUnits,
      withPromoUnits,
    };
  });
}

/** Chart-friendly series for “baseline vs with planned promos”. */
export function buildWhatIfWeeklySeries(rows: PlannerWeekRow[]) {
  return rows.map((r) => ({
    week: r.weekLabel,
    baseline: r.baselineUnits,
    withPromotions: r.withPromoUnits,
    incremental: r.incrementalUnits,
  }));
}
