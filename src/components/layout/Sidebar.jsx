import { NavLink } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/score-entry", label: "Score Entry" },
  { to: "/students", label: "Students" },
  { to: "/leaderboard/manage", label: "Leaderboard" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

function Sidebar() {
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
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
