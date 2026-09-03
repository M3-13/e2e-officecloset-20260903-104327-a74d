import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AccountPage() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      navigate("/register", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Konto konnte nicht gelöscht werden."
      );
      setDeleting(false);
    }
  }

  return (
    <section className="page">
      <h1>Konto</h1>

      <div className="card account-card">
        <p className="account-card__label">Angemeldet als</p>
        <p className="account-card__email">{user?.email ?? "–"}</p>
        <div className="account-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleLogout()}
          >
            Abmelden
          </button>
        </div>
      </div>

      <div className="card account-card">
        <p className="account-card__label">Gefahrenzone</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!confirmOpen ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Konto löschen
          </button>
        ) : (
          <div
            className="confirm-panel"
            role="dialog"
            aria-label="Konto löschen bestätigen"
          >
            <p>
              Möchtest du dein Konto wirklich löschen? Alle Kleidungsstücke,
              Bilder, Outfits und Kategorien werden dauerhaft entfernt. Diese
              Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="account-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? "Wird gelöscht…" : "Ja, endgültig löschen"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
