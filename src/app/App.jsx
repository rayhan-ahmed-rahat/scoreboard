import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../pages/DashboardPage";
import LeaderboardPage from "../pages/LeaderboardPage";
import LoginPage from "../pages/LoginPage";
import ReportsPage from "../pages/ReportsPage";
import ScoreEntryPage from "../pages/ScoreEntryPage";
import SettingsPage from "../pages/SettingsPage";
import StudentProfilePage from "../pages/StudentProfilePage";
import StudentsPage from "../pages/StudentsPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage publicView />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="score-entry" element={<ScoreEntryPage />} />
        <Route path="leaderboard/manage" element={<LeaderboardPage />} />
        <Route path="students/:studentId" element={<StudentProfilePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
