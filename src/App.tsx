import { ForecastDashboard } from "./components/forecast/ForecastDashboard";
import { AppShell } from "./components/shell/AppShell";

export default function App() {
  return (
    <AppShell>
      <ForecastDashboard />
    </AppShell>
  );
}
