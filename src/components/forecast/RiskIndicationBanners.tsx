import { useMemo } from "react";
import { buildRiskIndications } from "../../data/riskIndications";

export function RiskIndicationBanners(props: {
  category: string;
  sku: string;
  skuName?: string;
}) {
  const items = useMemo(
    () => buildRiskIndications(props),
    [props.category, props.sku, props.skuName]
  );

  return (
    <div className="risk-banners">
      <div className="risk-banners__stack">
        {items.map((it) => (
          <div
            key={it.id}
            className={`risk-banner risk-banner--${it.severity}`}
          >
            {it.domain !== "Cost" && (
              <div className="risk-banner__kicker">{it.domain}</div>
            )}
            <div className="risk-banner__text">
              <div className="risk-banner__headline">{it.headline}</div>
              <div className="risk-banner__detail">{it.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

