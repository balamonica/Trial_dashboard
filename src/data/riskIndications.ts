export type RiskIndication = {
  id: string;
  severity: "info" | "medium" | "high";
  domain: "Cost" | "Lead time" | "Availability" | "Demand";
  headline: string;
  detail: string;
  tags: string[];
  confidence?: number; // 0..1 (mocked)
};

function skuFlavor(skuName: string) {
  const s = (skuName || "").toLowerCase();
  if (/(olive|sunflower|canola|soy|palm)\s*oil/.test(s)) return "edible_oil";
  if (/(milk|yogurt|cheese|butter|cream)/.test(s)) return "dairy";
  if (/(rice|wheat|flour|grain|pasta)/.test(s)) return "staple";
  if (/(beer|lager|stout|ale)/.test(s)) return "beer";
  if (/(wine|vodka|whisky|whiskey|rum|gin|tequila|spirit)/.test(s))
    return "spirits";
  if (/(chicken|beef|mutton|pork|fish|seafood)/.test(s)) return "protein";
  return "generic";
}

function buildBaseSet(params: {
  category: string;
  sku: string;
  skuName?: string;
}) {
  const { category, skuName } = params;
  const flavor = skuFlavor(skuName ?? "");

  // We keep these as "LLM-shaped" objects: headline + detail + tags + confidence.
  // Later you can replace this with a backend call that fetches live news and runs an LLM prompt.
  const categorySpecific: RiskIndication[] = [];
  const cat = category.toLowerCase();

  if (cat.includes("alcohol")) {
    categorySpecific.push({
      id: "asean-spirits-duty",
      severity: "high",
      domain: "Cost",
      headline:
        "Anticipated update to ASEAN trade harmonization standards may increase import duties on spirits by 5.8% next month.",
      detail:
        "This will likely raise the Cost of Goods Sold (COGS) across your premium portfolio. Action: Recommend front-loading inventory orders before the 1st to lock in current duty rates and maintain your 25% retail margin.",
      tags: ["asean", "duty", "spirits", "cogs", "trade"],
      confidence: 0.76,
    });
  }

  const flavorSpecific: RiskIndication[] = [];
  if (flavor === "edible_oil") {
    flavorSpecific.push({
      id: "edible-oil",
      severity: "high",
      domain: "Cost",
      headline: "Edible oil costs can spike with regional conflict and freight",
      detail:
        "Edible oils are exposed to both commodity swings and shipping costs. If conflict escalates near key routes, landed cost increases can be rapid (weeks, not months).",
      tags: ["edible-oil", "commodity", "freight", "routes"],
      confidence: 0.73,
    });
  }

  /** News-style alert shown first when present in the top-N slice. */
  const crudeOilConflict: RiskIndication = {
    id: "crude-oil-mideast",
    severity: "high",
    domain: "Cost",
    headline:
      "Crude oil volatility detected following regional conflict in the Middle East.",
    detail:
      "Projected 12% increase in regional freight surcharges. Recommend reviewing Q3 pricing strategy to protect net profit margins.",
    tags: ["crude-oil", "freight", "pricing", "margins", "geopolitical"],
    confidence: 0.78,
  };

  const out = [crudeOilConflict, ...flavorSpecific, ...categorySpecific];

  // keep to 3 items for banner column density
  const unique = new Map<string, RiskIndication>();
  for (const x of out) unique.set(x.id, x);
  return Array.from(unique.values()).slice(0, 3);
}

export function buildRiskIndications(params: {
  category: string;
  sku: string;
  skuName?: string;
}): RiskIndication[] {
  if (!params.sku) return [];
  return buildBaseSet(params);
}

