import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { subscribeToBatches } from "../services/studentService";

function LoginPage() {
  const location = useLocation();
  const { user, studentSession, login, loginAsStudent } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("teacher");
  const [teacherForm, setTeacherForm] = useState({ email: "", password: "" });
  const [studentForm, setStudentForm] = useState({ batch: "", studentId: "" });
  const [batches, setBatches] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBatches(setBatches, () => {});
    return unsubscribe;
  }, []);

  if (user) {
    const from = location.state?.from?.pathname;
    const safePath = from && !from.startsWith("/student") ? from : "/";
    return <Navigate to={safePath} replace />;
  }

  if (studentSession) {
    return <Navigate to="/student/queue" replace />;
  }

  const handleTeacherChange = (event) => {
    const { name, value } = event.target;
    setTeacherForm((current) => ({ ...current, [name]: value }));
  };

  const handleStudentChange = (event) => {
    const { name, value } = event.target;
    setStudentForm((current) => ({ ...current, [name]: value }));
  };

  const handleTeacherSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);

    try {
      await login(teacherForm.email.trim(), teacherForm.password);
      showToast("Logged in successfully.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();

    if (!studentForm.batch) {
      showToast("Please select your batch.", "error");
      return;
    }

    if (!studentForm.studentId.trim()) {
      showToast("Please enter your student ID.", "error");
      return;
    }

    setBusy(true);

    try {
      await loginAsStudent(studentForm.batch, studentForm.studentId.trim());
      showToast("Welcome! You're now in the student portal.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>The Tech Academy Scoreboard</h1>
        <p className="auth-copy">
          Select your role to continue.
        </p>

        <div className="login-tabs">
          <button
            type="button"
            className={tab === "teacher" ? "login-tab login-tab--active" : "login-tab"}
            onClick={() => setTab("teacher")}
          >
            Teacher / Admin
          </button>
          <button
            type="button"
            className={tab === "student" ? "login-tab login-tab--active" : "login-tab"}
            onClick={() => setTab("student")}
          >
            Student
          </button>
        </div>

        {tab === "teacher" ? (
          <form className="auth-form" onSubmit={handleTeacherSubmit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={teacherForm.email}
                onChange={handleTeacherChange}
                placeholder="teacher@techacademy.com"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={teacherForm.password}
                onChange={handleTeacherChange}
                placeholder="Enter your password"
                required
              />
            </label>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Signing in..." : "Log in"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleStudentSubmit}>
            <label>
              <span>Batch / Group</span>
              <select
                name="batch"
                value={studentForm.batch}
                onChange={handleStudentChange}
                required
              >
                <option value="">Select your batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Student ID</span>
              <input
                name="studentId"
                value={studentForm.studentId}
                onChange={handleStudentChange}
                placeholder="Enter your student ID"
                required
              />
            </label>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Looking you up..." : "Enter"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
