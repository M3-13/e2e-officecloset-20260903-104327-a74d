import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/wardrobe", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("E-Mail oder Passwort ist falsch.");
      } else {
        setError(
          err instanceof Error ? err.message : "Anmeldung fehlgeschlagen."
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <div className="auth-card card">
        <h1>Anmelden</h1>
        <p className="auth-card__hint">
          Melde dich an, um deine Garderobe zu verwalten.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="label" htmlFor="login-email">
              E-Mail
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="login-password">
              Passwort
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>
        <p className="auth-card__switch">
          Noch kein Konto? <Link to="/register">Registrieren</Link>
        </p>
      </div>
    </section>
  );
}
