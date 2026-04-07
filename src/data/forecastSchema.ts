/**
 * Types aligned with ERP concepts (products, orders, warehouse_inv, routes)
 * used by the Forecast demo dummy generator.
 */

export type ForecastCategoryId = "processed_seafood" | "alcohol" | "dairy";

export const FORECAST_CATEGORY_LABELS: Record<ForecastCategoryId, string> = {
  processed_seafood: "Processed Seafood",
  alcohol: "Alcohol",
  dairy: "Dairy",
};

/** Short-horizon demand: SKU × fulfillment slice (mirrors item_info + warehouse + route). */
export interface ShortHorizonDemandRow {
  sku: string;
  productName: string;
  categoryId: ForecastCategoryId;
  shipToId: string;
  shipToName: string;
  routeId: string;
  routeName: string;
  warehouseId: string;
  warehouseName: string;
  /** Forecast units for next 7 days */
  forecastUnits7d: number;
}

/** Weekly promo lift: baseline vs promotional period. */
export interface PromoLiftWeek {
  weekLabel: string;
  categoryId: ForecastCategoryId;
  baselineRevenue: number;
  promoRevenue: number;
  isPromoWeek: boolean;
}

/** Cannibalization cell: impact of row SKU on column SKU (share shift, -1..1). */
export interface CannibalizationCell {
  categoryId: ForecastCategoryId;
  newProductSku: string;
  existingProductSku: string;
  impactPct: number;
}

/** Customer churn / dormancy bucket. */
export interface ChurnBucket {
  categoryId: ForecastCategoryId;
  segment: string;
  dormantPct: number;
  atRiskPct: number;
  healthyPct: number;
}

/** Whale concentration: revenue share top 5% vs rest. */
export interface WhaleConcentration {
  categoryId: ForecastCategoryId;
  top5PctRevenueShare: number;
  remaining95PctRevenueShare: number;
  giniApprox: number;
}

/** Stockout vs obsolescence positioning. */
export interface InventoryRiskPoint {
  sku: string;
  shortName: string;
  categoryId: ForecastCategoryId;
  stockoutRisk: number;
  obsolescenceRisk: number;
  annualRevenue: number;
}

/** Reorder vs safety stock comparison. */
export interface ReorderSafetyRow {
  sku: string;
  productName: string;
  categoryId: ForecastCategoryId;
  currentStockUnits: number;
  recommendedSafetyStock: number;
  recommendedReorderPoint: number;
  daysOfCover: number;
}

/** Credit risk by customer segment. */
export interface CreditRiskSegment {
  categoryId: ForecastCategoryId;
  segment: string;
  avgRiskScore: number;
  exposureK: number;
  accounts: number;
}

export interface ForecastDummyDataset {
  shortHorizon: ShortHorizonDemandRow[];
  promoLift: PromoLiftWeek[];
  cannibalization: CannibalizationCell[];
  churn: ChurnBucket[];
  whale: WhaleConcentration[];
  inventoryRisk: InventoryRiskPoint[];
  reorderSafety: ReorderSafetyRow[];
  creditRisk: CreditRiskSegment[];
}
