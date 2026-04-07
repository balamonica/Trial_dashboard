import type { ReactNode } from "react";
import "./shell.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="erp-shell">
      <header className="erp-topnav">
        <nav className="erp-topnav-links">
          <span className="erp-topnav-link">Admin Console</span>
          <span className="erp-topnav-link">Order Management</span>
          <span className="erp-topnav-link">Product Manager</span>
          <span className="erp-topnav-link">Warehouse Management System</span>
        </nav>
        <div className="erp-topnav-user">
          <span className="erp-bell" aria-hidden>
            🔔
          </span>
          <span className="erp-email">admin@mindmastersg.com</span>
          <span className="erp-avatar" aria-hidden>
            A
          </span>
        </div>
      </header>
      <div className="erp-body">
        <aside className="erp-sidebar" aria-label="Main navigation">
          <div className="erp-sidebar-inner">
            <button type="button" className="erp-sb-icon" title="Home">
              ⌂
            </button>
            <button type="button" className="erp-sb-icon" title="Users">
              👤
            </button>
            <button type="button" className="erp-sb-icon erp-sb-icon--active" title="Forecast">
              ◎
            </button>
            <button type="button" className="erp-sb-icon" title="Inventory">
              ▦
            </button>
            <button type="button" className="erp-sb-icon" title="Reports">
              📊
            </button>
          </div>
        </aside>
        <main className="erp-main">{children}</main>
      </div>
    </div>
  );
}
