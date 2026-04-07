import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FutureWeekBaseline } from "../data/promotionDemoMetrics";

export interface ForecastPromotionContextValue {
  /** Selected promotion names per future week (multi-select). */
  promotionPlanByWeek: Record<string, string[]>;
  setPromotionsForWeek: (weekLabel: string, promotionNames: string[]) => void;
  togglePromotionForWeek: (weekLabel: string, promotionName: string) => void;
  /** Clears weekly plan (e.g. when category changes so promo names differ). */
  resetPromotionPlan: () => void;
  /** Future weeks from Sales tab SKU forecast (drives promo planner baselines). */
  salesFutureBaselines: FutureWeekBaseline[];
  setSalesFutureBaselines: (rows: FutureWeekBaseline[]) => void;
  salesReferenceSku: string | null;
  setSalesReferenceSku: (sku: string | null) => void;
}

const ForecastPromotionContext =
  createContext<ForecastPromotionContextValue | null>(null);

export function ForecastPromotionProvider({ children }: { children: ReactNode }) {
  const [promotionPlanByWeek, setPromotionPlanByWeek] = useState<
    Record<string, string[]>
  >({});
  const [salesFutureBaselines, setSalesFutureBaselines] = useState<
    FutureWeekBaseline[]
  >([]);
  const [salesReferenceSku, setSalesReferenceSku] = useState<string | null>(
    null
  );

  const setPromotionsForWeek = useCallback(
    (weekLabel: string, promotionNames: string[]) => {
      setPromotionPlanByWeek((prev) => ({
        ...prev,
        [weekLabel]: promotionNames,
      }));
    },
    []
  );

  const togglePromotionForWeek = useCallback(
    (weekLabel: string, promotionName: string) => {
      setPromotionPlanByWeek((prev) => {
        const cur = prev[weekLabel] ?? [];
        const next = cur.includes(promotionName)
          ? cur.filter((x) => x !== promotionName)
          : [...cur, promotionName];
        return { ...prev, [weekLabel]: next };
      });
    },
    []
  );

  const resetPromotionPlan = useCallback(() => {
    setPromotionPlanByWeek({});
  }, []);

  const value = useMemo<ForecastPromotionContextValue>(
    () => ({
      promotionPlanByWeek,
      setPromotionsForWeek,
      togglePromotionForWeek,
      resetPromotionPlan,
      salesFutureBaselines,
      setSalesFutureBaselines,
      salesReferenceSku,
      setSalesReferenceSku,
    }),
    [
      promotionPlanByWeek,
      setPromotionsForWeek,
      togglePromotionForWeek,
      resetPromotionPlan,
      salesFutureBaselines,
      salesReferenceSku,
    ]
  );

  return (
    <ForecastPromotionContext.Provider value={value}>
      {children}
    </ForecastPromotionContext.Provider>
  );
}

export function useForecastPromotion(): ForecastPromotionContextValue {
  const ctx = useContext(ForecastPromotionContext);
  if (!ctx) {
    throw new Error(
      "useForecastPromotion must be used within ForecastPromotionProvider"
    );
  }
  return ctx;
}
