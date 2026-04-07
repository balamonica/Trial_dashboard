import type {
  ForecastCategoryId,
  ForecastDummyDataset,
} from "./forecastSchema";

/** Deterministic pseudo-random for stable investor demos */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WAREHOUSES = [
  { id: "wh-sin-01", name: "Singapore DC — Cold Chain" },
  { id: "wh-sin-02", name: "Singapore DC — Ambient" },
  { id: "wh-jb-01", name: "Johor Bonded" },
];

const ROUTES = [
  { id: "rt-north", name: "North Island A" },
  { id: "rt-east", name: "East Coast Express" },
  { id: "rt-cbd", name: "CBD Premium" },
  { id: "rt-west", name: "West Industrial" },
];

const SHIP_TOS = [
  { id: "st-hotel-grp", name: "Marina Hotel Group" },
  { id: "st-chain-fb", name: "TasteCraft F&B Chain" },
  { id: "st-dist", name: "Metro Fine Foods Dist." },
  { id: "st-retail", name: "Harbour Retail Co-op" },
];

const PRODUCT_SEEDS: Record<
  ForecastCategoryId,
  { skuPrefix: string; items: { sku: string; name: string }[] }
> = {
  processed_seafood: {
    skuPrefix: "21",
    items: [
      { sku: "21088412", name: "SG SMKD SALMON PORTION 200G" },
      { sku: "21088413", name: "NO CHILL ATLANTIC COD 1KG" },
      { sku: "21088414", name: "JP SASHIMI TUNA BLOCK AAA" },
      { sku: "21088415", name: "NZ GREEN MUSSEL MEAT 1KG" },
      { sku: "21088416", name: "TH SURIMI CRAB STICK 500G" },
      { sku: "21088417", name: "VN PANGASIUS FILLET IQF" },
    ],
  },
  alcohol: {
    skuPrefix: "08",
    items: [
      { sku: "08011234", name: "FR BORDEAUX RED 750ML" },
      { sku: "08011235", name: "NZ SAUV BLANC 750ML" },
      { sku: "08011236", name: "JP SAKE JUNMAI 720ML" },
      { sku: "08011237", name: "SCOTCH SINGLE MALT 700ML" },
      { sku: "08011238", name: "CRAFT IPA 330ML CS24" },
      { sku: "08011239", name: "SPARKLING PROSECCO 750ML" },
    ],
  },
  dairy: {
    skuPrefix: "12",
    items: [
      { sku: "12055601", name: "AU CHEDDAR BLOCK 2KG" },
      { sku: "12055602", name: "FR BRIE WHEEL 1KG" },
      { sku: "12055603", name: "UHT MILK FULL 1L CS12" },
      { sku: "12055604", name: "GREEK YOGURT PLAIN 5KG" },
      { sku: "12055605", name: "BUTTER UNSALTED 250G" },
      { sku: "12055606", name: "MOZZARELLA SHRED 2KG" },
    ],
  },
};

function categoryMultiplier(cat: ForecastCategoryId): number {
  switch (cat) {
    case "processed_seafood":
      return 1.15;
    case "alcohol":
      return 0.85;
    case "dairy":
      return 1.0;
    default:
      return 1;
  }
}

export function generateForecastDummyData(): ForecastDummyDataset {
  const categories: ForecastCategoryId[] = [
    "processed_seafood",
    "alcohol",
    "dairy",
  ];

  const shortHorizon: ForecastDummyDataset["shortHorizon"] = [];
  const promoLift: ForecastDummyDataset["promoLift"] = [];
  const cannibalization: ForecastDummyDataset["cannibalization"] = [];
  const churn: ForecastDummyDataset["churn"] = [];
  const whale: ForecastDummyDataset["whale"] = [];
  const inventoryRisk: ForecastDummyDataset["inventoryRisk"] = [];
  const reorderSafety: ForecastDummyDataset["reorderSafety"] = [];
  const creditRisk: ForecastDummyDataset["creditRisk"] = [];

  for (const cat of categories) {
    const seed =
      cat === "processed_seafood" ? 1001 : cat === "alcohol" ? 2002 : 3003;
    const rnd = mulberry32(seed);
    const mult = categoryMultiplier(cat);
    const products = PRODUCT_SEEDS[cat].items;

    for (const p of products) {
      for (const wh of WAREHOUSES) {
        for (const rt of ROUTES.slice(0, 3)) {
          for (const st of SHIP_TOS.slice(0, 2)) {
            const base = 40 + rnd() * 120;
            shortHorizon.push({
              sku: p.sku,
              productName: p.name,
              categoryId: cat,
              shipToId: st.id,
              shipToName: st.name,
              routeId: rt.id,
              routeName: rt.name,
              warehouseId: wh.id,
              warehouseName: wh.name,
              forecastUnits7d: Math.round(base * mult * (0.7 + rnd())),
            });
          }
        }
      }
    }

    const weeks = ["W-4", "W-3", "W-2", "W-1", "W+0", "W+1"];
    for (let i = 0; i < weeks.length; i++) {
      const isPromo = i === 2 || i === 4;
      const baseRev = (180 + rnd() * 90) * mult;
      const lift = isPromo ? 1.35 + rnd() * 0.25 : 1;
      promoLift.push({
        weekLabel: weeks[i],
        categoryId: cat,
        baselineRevenue: Math.round(baseRev * 1000) / 1000,
        promoRevenue: Math.round(baseRev * lift * 1000) / 1000,
        isPromoWeek: isPromo,
      });
    }

    const newSku = products[0].sku;
    for (let j = 1; j < products.length; j++) {
      const impact = -(0.04 + rnd() * 0.12);
      cannibalization.push({
        categoryId: cat,
        newProductSku: newSku,
        existingProductSku: products[j].sku,
        impactPct: Math.round(impact * 1000) / 10,
      });
    }

    const entDorm = 8 + rnd() * 6;
    const entRisk = 14 + rnd() * 8;
    const entHealth = 100 - entDorm - entRisk;
    churn.push({
      categoryId: cat,
      segment: "Enterprise HORECA",
      dormantPct: Math.round(entDorm * 10) / 10,
      atRiskPct: Math.round(entRisk * 10) / 10,
      healthyPct: Math.round(entHealth * 10) / 10,
    });
    const smbDorm = 18 + rnd() * 10;
    const smbRisk = 22 + rnd() * 10;
    const smbHealth = 100 - smbDorm - smbRisk;
    churn.push({
      categoryId: cat,
      segment: "SMB Retail",
      dormantPct: Math.round(smbDorm * 10) / 10,
      atRiskPct: Math.round(smbRisk * 10) / 10,
      healthyPct: Math.round(smbHealth * 10) / 10,
    });

    const top5 = 0.38 + rnd() * 0.12;
    whale.push({
      categoryId: cat,
      top5PctRevenueShare: Math.round(top5 * 1000) / 10,
      remaining95PctRevenueShare: Math.round((1 - top5) * 1000) / 10,
      giniApprox: Math.round((0.42 + rnd() * 0.15) * 100) / 100,
    });

    for (const p of products) {
      const stockout = rnd() * 100;
      const obso = rnd() * 100;
      inventoryRisk.push({
        sku: p.sku,
        shortName: p.name.slice(0, 24),
        categoryId: cat,
        stockoutRisk: Math.round(stockout * 10) / 10,
        obsolescenceRisk: Math.round(obso * 10) / 10,
        annualRevenue: Math.round((50 + rnd() * 220) * mult * 1000),
      });
    }

    for (const p of products) {
      const safety = 80 + rnd() * 140;
      const current = safety * (0.4 + rnd() * 1.1);
      const days = Math.max(2, Math.round(14 + rnd() * 18 - (current / safety) * 8));
      reorderSafety.push({
        sku: p.sku,
        productName: p.name,
        categoryId: cat,
        currentStockUnits: Math.round(current),
        recommendedSafetyStock: Math.round(safety),
        recommendedReorderPoint: Math.round(safety * 1.25),
        daysOfCover: days,
      });
    }

    const segments = [
      { name: "Tier A — National", base: 22, exp: 4200 },
      { name: "Tier B — Regional", base: 38, exp: 1800 },
      { name: "Tier C — Local", base: 55, exp: 620 },
    ];
    for (const s of segments) {
      creditRisk.push({
        categoryId: cat,
        segment: s.name,
        avgRiskScore: Math.round((s.base + rnd() * 14) * 10) / 10,
        exposureK: Math.round(s.exp * mult * (0.85 + rnd() * 0.3)),
        accounts: Math.round(12 + rnd() * 40),
      });
    }
  }

  return {
    shortHorizon,
    promoLift,
    cannibalization,
    churn,
    whale,
    inventoryRisk,
    reorderSafety,
    creditRisk,
  };
}

export const STATIC_FORECAST_DATA: ForecastDummyDataset =
  generateForecastDummyData();
