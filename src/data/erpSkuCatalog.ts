/**
 * Snapshot from mindmasters DB (category + products).
 * Only Processed Food, Alcohol, and Dairy include SKU options for the demo forecast.
 */

/** All ERP categories: priority three first, then remaining A–Z. */
export const ERP_CATEGORY_DROPDOWN_ORDER: string[] = [
  "Processed Food",
  "Alcohol",
  "Dairy",
  "Bakery",
  "Bundle Set",
  "By Product",
  "Dry Food",
  "Fine Food",
  "Fruit & Vegetable",
  "Ingredients",
  "Meat",
  "Meat Portion",
  "Menu",
  "Non Alcohol",
  "NonFood",
  "Packaging",
  "Potato",
  "Processed Meat",
  "Processed Seafood",
  "Ready To Serve",
  "Seafood",
  "Seafood Portion",
  "Service",
  "Dairy Portion",
];

export const CATEGORIES_WITH_SKU_DATA = new Set([
  "Processed Food",
  "Alcohol",
  "Dairy",
]);

export interface SkuOption {
  sku: string;
  name: string;
}

/** Five SKUs per supported category (from DB). */
export const SKUS_BY_ERP_CATEGORY: Record<string, SkuOption[]> = {
  "Processed Food": [
    { sku: "10702790", name: "*AE FZ PB 30 DPLG CRYST VEG 600GX9 ARLE" },
    { sku: "10703124", name: "SG FZ CHK CHIPOLATA ±30G 12X1KG MTWK" },
    { sku: "10703145", name: "SG FZ BEEF SSG ±60G MTWK" },
    { sku: "10703146", name: "SG FZ CHK CHEESEY SSG ±60G 12X1KG MTWK" },
    { sku: "10703149", name: "SG FZ BEEF PEPPERONI 2.2MM 12X1KG MTWK" },
  ],
  Alcohol: [
    { sku: "11100043", name: "JP CH UMESKY 729ML" },
    { sku: "11100043-CAR", name: "JP CH UMESKY 729ML-CAR" },
    { sku: "11100053", name: "JP CH NIKAIDO SHOCHU 720ML" },
    { sku: "11100053-CAR", name: "JP CH NIKAIDO SHOCHU 720ML-CAR" },
    { sku: "11100054", name: "JP CH HIMIKO BRANDY 500ML" },
  ],
  Dairy: [
    { sku: "10501115", name: "FR CH CHEESE BRILLAT SAVARIN 200G DEX" },
    { sku: "10501159", name: "NZ FZ BUTTER CLARIFIED 3.8KGX4 CANARY" },
    { sku: "10501162", name: "NZ FZ BUTTER MED SALTED 8GX288 CANARY" },
    { sku: "10501163", name: "NZ FZ BUTTER MED UNSALTED 8GX288 CANARY" },
    { sku: "10501175", name: "FR CH CREAM 35.1% WHIP 1LTRX12 CANDIA" },
  ],
};
