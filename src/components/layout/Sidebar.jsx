import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { subscribeToQueue } from "../../services/queueService";

function Sidebar() {
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToQueue(
      (rows) => {
        setWaitingCount(rows.filter((e) => e.status === "waiting").length);
      },
      () => {}
    );

    return unsubscribe;
  }, []);

  const navigationItems = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/score-entry", label: "Score Entry" },
    { to: "/queue", label: "Queue" },
    { to: "/students", label: "Students" },
    { to: "/leaderboard/manage", label: "Leaderboard" },
    { to: "/reports", label: "Reports" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand-mark">TA</span>
        <div>
          <strong>The Tech Academy</strong>
          <p>Scoreboard</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            {item.label}
            {item.to === "/queue" && waitingCount > 0 && (
              <span className="queue-count-badge">{waitingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
