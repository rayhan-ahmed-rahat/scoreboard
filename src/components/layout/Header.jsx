import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import RoleBadge from "../common/RoleBadge";
import { COLLECTIONS } from "../../firebase/collections";
import { db } from "../../firebase/config";
import { buildTeacherProfile } from "../../utils/formatters";

function Header() {
  const { user, profile, logout } = useAuth();
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "light"
  );
  const [displayName, setDisplayName] = useState(buildTeacherProfile(user).name);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, COLLECTIONS.USERS, user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setDisplayName(data.displayName || buildTeacherProfile(user).name);
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("tta-theme");

    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("tta-theme", theme);
  }, [theme]);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Points and progress</p>
        <h1>The Tech Academy Scoreboard</h1>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        >
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
        <div className="profile-chip">
          <div>
            <div className="profile-chip__meta">
              <strong>{displayName}</strong>
              <RoleBadge role={profile?.role} />
            </div>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="text-button" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
