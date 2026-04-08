import { useState } from "react";
import { ForecastPromotionProvider } from "../../context/ForecastPromotionContext";
import { InventoryManagementTab } from "./InventoryManagementTab";
import { SalesDemandForecastTab } from "./SalesDemandForecastTab";
import "./forecast.css";

type ForecastMainTab = "sales" | "inventory";

export function ForecastDashboard() {
  const [mainTab, setMainTab] = useState<ForecastMainTab>("sales");

  return (
    <ForecastPromotionProvider>
    <div className="forecast-page">
      <header className="forecast-topbar">
        <div className="forecast-title-block">
          <h1>Forecast</h1>
        </div>
      </header>

      <nav className="forecast-main-tabs" aria-label="Forecast sections">
        <button
          type="button"
          className={`forecast-main-tab ${mainTab === "sales" ? "active" : ""}`}
          onClick={() => setMainTab("sales")}
        >
          Sales and Demand Forecast
        </button>
        <button
          type="button"
          className={`forecast-main-tab ${mainTab === "inventory" ? "active" : ""}`}
          onClick={() => setMainTab("inventory")}
        >
          Inventory Prediction
        </button>
      </nav>

      {mainTab === "sales" ? (
        <SalesDemandForecastTab />
      ) : (
        <InventoryManagementTab />
      )}
    </div>
    </ForecastPromotionProvider>
  );
}
