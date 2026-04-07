/**
 * Promotion display names from mindmasters.
 *
 * Canonical source (union — run when refreshing):
 *
 * SELECT DISTINCT trim(x) AS name FROM (
 *   SELECT deal_name AS x FROM deals
 *   WHERE deal_name IS NOT NULL AND trim(deal_name) <> ''
 *   UNION ALL
 *   SELECT name AS x FROM promotiondetails
 *   WHERE COALESCE(is_deleted, false) = false
 *     AND name IS NOT NULL AND trim(name) <> ''
 *   UNION ALL
 *   SELECT discount_name AS x FROM discounts
 *   WHERE discount_name IS NOT NULL AND trim(discount_name) <> ''
 * ) s ORDER BY 1;
 *
 * Snapshot: `deals`, `promotiondetails`, and `discounts` returned no rows — array is empty.
 * Paste query results here when your catalog has data; the UI will switch to live names.
 */
export const PROMOTION_NAMES_FROM_DB: readonly string[] = [];

/**
 * Demo-only: distinct campaigns per ERP category (counts: Processed Food 4,
 * Alcohol 3, Dairy 5). Used when `PROMOTION_NAMES_FROM_DB` is empty.
 */
export const DEMO_PROMOTIONS_BY_CATEGORY: Readonly<
  Record<string, readonly string[]>
> = {
  "Processed Food": [
    "Frozen bundle multi-buy",
    "HORECA chef loyalty 10%",
    "Cold chain free delivery",
    "Weekend flash (frozen)",
  ],
  Alcohol: [
    "Wine list partner promo",
    "Bar corridor discount",
    "Duty-paid corridor",
  ],
  Dairy: [
    "Breakfast program",
    "Café chilled bundle",
    "Fresh corridor rebate",
    "Foodservice bulk tier",
    "School milk program",
  ],
};

/** When a category has no demo entry (e.g. before DB sync), keep a short generic list. */
const DEMO_PROMOTIONS_FALLBACK: readonly string[] = [
  "Regional corridor promo",
  "Partner loyalty tier",
  "Seasonal bundle",
];

export type PromotionNameSource = "database" | "demo_labels";

export function getPromotionNameSource(): PromotionNameSource {
  return PROMOTION_NAMES_FROM_DB.length > 0 ? "database" : "demo_labels";
}

/**
 * Names for promo planner + effectiveness charts.
 * DB snapshot is flat (no category column in the union); when present, all
 * categories share that list. Otherwise demo labels are chosen per category.
 */
export function getPromotionNamesForUi(category: string): string[] {
  if (PROMOTION_NAMES_FROM_DB.length > 0) {
    return [...PROMOTION_NAMES_FROM_DB];
  }
  const demo = DEMO_PROMOTIONS_BY_CATEGORY[category];
  if (demo?.length) return [...demo];
  return [...DEMO_PROMOTIONS_FALLBACK];
}
