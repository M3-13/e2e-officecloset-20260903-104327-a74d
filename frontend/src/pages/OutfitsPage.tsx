import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, getToken } from "../api/client";
import { deleteOutfit, listOutfits, type OutfitOut } from "../api/outfits";
import { wardrobeImageUrl, type ClothingItemOut } from "../api/wardrobe";
import "./OutfitsPage.css";

interface ToastState {
  message: string;
  kind: "success" | "error";
}

function ItemThumb({ item }: { item: ClothingItemOut }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const token = getToken();

    (async () => {
      try {
        const response = await fetch(wardrobeImageUrl(item.id), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          if (!cancelled) {
            setFailed(true);
          }
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setUrl(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.id]);

  if (url) {
    return <img className="outfit-thumb" src={url} alt={item.name} />;
  }

  return (
    <div
      className={
        failed
          ? "outfit-thumb outfit-thumb--empty"
          : "outfit-thumb outfit-thumb--loading"
      }
      role="img"
      aria-label={failed ? "Bild nicht verfügbar" : item.name}
    />
  );
}

function OutfitCard({
  outfit,
  onRequestDelete,
}: {
  outfit: OutfitOut;
  onRequestDelete: (outfit: OutfitOut) => void;
}) {
  return (
    <article className="outfit-card">
      <header className="outfit-card__header">
        <h3 className="outfit-card__name">{outfit.name}</h3>
        <div className="outfit-card__actions">
          <Link
            to={`/outfits/${outfit.id}/edit`}
            className="btn btn-secondary"
            aria-label={`${outfit.name} bearbeiten`}
          >
            Bearbeiten
          </Link>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onRequestDelete(outfit)}
            aria-label={`${outfit.name} löschen`}
          >
            Löschen
          </button>
        </div>
      </header>

      {outfit.items.length === 0 ? (
        <p className="outfit-card__empty">Keine Teile enthalten</p>
      ) : (
        <ul className="outfit-card__items">
          {outfit.items.map((item) => (
            <li key={item.id} className="outfit-card__item">
              <ItemThumb item={item} />
              <span className="outfit-card__item-name">{item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<OutfitOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<OutfitOut | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  function load() {
    setLoading(true);
    setLoadError(null);
    listOutfits()
      .then(setOutfits)
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError
            ? err.detail
            : "Die Outfits konnten nicht geladen werden."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleDelete() {
    if (!confirmTarget) {
      return;
    }
    setDeleting(true);
    try {
      await deleteOutfit(confirmTarget.id);
      setOutfits((previous) =>
        previous.filter((outfit) => outfit.id !== confirmTarget.id)
      );
      setConfirmTarget(null);
      setToast({ message: "Outfit wurde gelöscht.", kind: "success" });
    } catch (err) {
      setConfirmTarget(null);
      setToast({
        message:
          err instanceof ApiError
            ? err.detail
            : "Löschen fehlgeschlagen. Bitte erneut versuchen.",
        kind: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <p className="outfits-status">Wird geladen…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="page">
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">
            !
          </div>
          <h2 className="empty-state__title">Fehler beim Laden</h2>
          <p className="empty-state__desc">{loadError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => load()}
          >
            Erneut versuchen
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="outfits-header">
        <div>
          <h1>Outfits</h1>
          <p className="outfits-header__subtitle">
            {outfits.length} {outfits.length === 1 ? "Outfit" : "Outfits"}
          </p>
        </div>
        <Link to="/outfits/neu" className="btn btn-primary">
          Neues Outfit
        </Link>
      </header>

      {outfits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">
            ✦
          </div>
          <h2 className="empty-state__title">Noch keine Outfits</h2>
          <p className="empty-state__desc">
            Kombiniere Teile aus deiner Garderobe zu deinem ersten Outfit.
          </p>
          <Link to="/outfits/neu" className="btn btn-primary">
            Neues Outfit
          </Link>
        </div>
      ) : (
        <div className="outfits-grid">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onRequestDelete={setConfirmTarget}
            />
          ))}
        </div>
      )}

      {confirmTarget ? (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!deleting) {
              setConfirmTarget(null);
            }
          }}
          role="presentation"
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-outfit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-outfit-title" className="modal__title">
              Outfit löschen?
            </h2>
            <p className="modal__text">
              Möchtest du „{confirmTarget.name}“ wirklich löschen? Das kann
              nicht rückgängig gemacht werden.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmTarget(null)}
                disabled={deleting}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? "Löschen…" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={
            toast.kind === "error" ? "toast toast--error" : "toast"
          }
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
