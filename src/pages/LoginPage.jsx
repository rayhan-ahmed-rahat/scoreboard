import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function LoginPage() {
  const location = useLocation();
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={location.state?.from?.pathname || "/"} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);

    try {
      await login(formData.email.trim(), formData.password);
      showToast("Logged in successfully.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Teacher access</p>
        <h1>The Tech Academy Scoreboard</h1>
        <p className="auth-copy">
          Securely manage student points, audit every score change, and track rankings
          in one place.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email address</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="teacher@techacademy.com"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </label>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Signing in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
