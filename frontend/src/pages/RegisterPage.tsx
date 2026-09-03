import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return "Bitte gib deine E-Mail-Adresse ein.";
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return "Bitte gib eine gültige E-Mail-Adresse ein.";
    }
    if (password.length < 8) {
      return "Das Passwort muss mindestens 8 Zeichen lang sein.";
    }
    if (password !== confirm) {
      return "Die Passwörter stimmen nicht überein.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      navigate("/wardrobe", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Diese E-Mail-Adresse ist bereits vergeben.");
      } else {
        setError(
          err instanceof Error ? err.message : "Registrierung fehlgeschlagen."
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <div className="auth-card card">
        <h1>Registrieren</h1>
        <p className="auth-card__hint">
          Erstelle ein Konto, um deine Garderobe zu verwalten.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="label" htmlFor="register-email">
              E-Mail
            </label>
            <input
              id="register-email"
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
            <label className="label" htmlFor="register-password">
              Passwort
            </label>
            <input
              id="register-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="register-confirm">
              Passwort bestätigen
            </label>
            <input
              id="register-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {submitting ? "Wird erstellt…" : "Konto erstellen"}
          </button>
        </form>
        <p className="auth-card__switch">
          Schon ein Konto? <Link to="/login">Anmelden</Link>
        </p>
      </div>
    </section>
  );
}
