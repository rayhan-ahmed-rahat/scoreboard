import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { ensureDefaultCategories } from "../../services/studentService";

function AppLayout() {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    ensureDefaultCategories().catch(() => {
      // The page stays usable even if seeding defaults is blocked by rules or connection issues.
    });
  }, [isAdmin]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__content">
        <Header />
        <main className="page-shell">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
