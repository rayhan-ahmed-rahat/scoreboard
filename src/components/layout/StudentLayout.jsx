import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingState from "../common/LoadingState";

function StudentLayout() {
  const { studentSession, logoutStudent, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Loading..." />;
  }

  if (!studentSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleLogout = () => {
    logoutStudent();
    navigate("/login");
  };

  return (
    <div className="student-shell">
      <header className="student-header">
        <div className="student-header__brand">
          <span className="brand-mark">TA</span>
          <div>
            <strong>The Tech Academy</strong>
            <p>Student Portal</p>
          </div>
        </div>

        <nav className="student-header__nav">
          <NavLink
            to="/student/queue"
            className={({ isActive }) =>
              isActive ? "student-nav-link student-nav-link--active" : "student-nav-link"
            }
          >
            My Queue
          </NavLink>
          <NavLink
            to="/student/leaderboard"
            className={({ isActive }) =>
              isActive ? "student-nav-link student-nav-link--active" : "student-nav-link"
            }
          >
            Leaderboard
          </NavLink>
        </nav>

        <div className="student-header__user">
          <div className="student-identity">
            <strong>{studentSession.name}</strong>
            <span>{studentSession.batchName} · {studentSession.studentId}</span>
          </div>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="student-content">
        <Outlet />
      </main>
    </div>
  );
}

export default StudentLayout;
