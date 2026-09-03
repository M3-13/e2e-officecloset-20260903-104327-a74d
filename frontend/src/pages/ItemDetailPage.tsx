import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { listCategories, type CategoryOut } from "../api/categories";
import { ApiError, getToken } from "../api/client";
import {
  deleteWardrobeItem,
  getWardrobeItem,
  updateWardrobeItem,
  wardrobeImageUrl,
  type ClothingItemOut,
} from "../api/wardrobe";
import "./ItemDetailPage.css";

type LoadStatus = "loading" | "ready" | "notfound" | "error";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function useWardrobeImage(
  id: number,
  version: number,
  enabled: boolean
): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const token = getToken();
        const response = await fetch(`${wardrobeImageUrl(id)}?v=${version}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled || !response.ok) {
          return;
        }
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        // The image simply does not render; the surrounding layout still works.
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id, version, enabled]);

  return src;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const parsedId = Number(id);
  const validId = Number.isInteger(parsedId) && parsedId > 0;

  const [item, setItem] = useState<ClothingItemOut | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [imageVersion, setImageVersion] = useState(0);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await getWardrobeItem(parsedId);
      setItem(data);
      setName(data.name);
      setDescription(data.description ?? "");
      setColor(data.color ?? "");
      setCategoryId(data.category_id != null ? String(data.category_id) : "");
      setStatus("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("notfound");
      } else {
        setStatus("error");
      }
    }
  }, [parsedId]);

  useEffect(() => {
    if (!validId) {
      setStatus("notfound");
      return;
    }
    void load();
  }, [load, validId]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const authedImageSrc = useWardrobeImage(
    parsedId,
    imageVersion,
    validId && status === "ready"
  );
  const displaySrc = imagePreview ?? authedImageSrc;

  const startEdit = () => {
    setFormError(null);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setFormError(null);
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (item) {
      setName(item.name);
      setDescription(item.description ?? "");
      setColor(item.color ?? "");
      setCategoryId(item.category_id != null ? String(item.category_id) : "");
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Bitte einen Namen angeben.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateWardrobeItem(parsedId, {
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
        color: color.trim() === "" ? null : color.trim(),
        category_id: categoryId === "" ? null : Number(categoryId),
        image: imageFile ?? undefined,
      });
      setItem(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setColor(updated.color ?? "");
      setCategoryId(updated.category_id != null ? String(updated.category_id) : "");
      setImageFile(null);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
      setImageVersion((v) => v + 1);
      setEditMode(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.detail : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteWardrobeItem(parsedId);
      navigate("/wardrobe");
    } catch (err) {
      setConfirmOpen(false);
      setFormError(
        err instanceof ApiError ? err.detail : "Löschen fehlgeschlagen."
      );
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading") {
    return (
      <section className="page item-detail">
        <p className="item-detail__status">Wird geladen…</p>
      </section>
    );
  }

  if (status === "notfound") {
    return (
      <section className="page item-detail">
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">
            ?
          </div>
          <h2 className="empty-state__title">Nicht gefunden</h2>
          <p className="empty-state__desc">
            Dieses Kleidungsstück existiert nicht oder wurde gelöscht.
          </p>
          <Link to="/wardrobe" className="btn btn-primary">
            Zurück zur Garderobe
          </Link>
        </div>
      </section>
    );
  }

  if (status === "error" || !item) {
    return (
      <section className="page item-detail">
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">
            !
          </div>
          <h2 className="empty-state__title">Fehler beim Laden</h2>
          <p className="empty-state__desc">
            Das Kleidungsstück konnte nicht geladen werden.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            Erneut versuchen
          </button>
        </div>
      </section>
    );
  }

  const categoryName =
    categories.find((category) => category.id === item.category_id)?.name ?? null;

  return (
    <section className="page item-detail">
      <Link to="/wardrobe" className="item-detail__back">
        ← Zurück zur Garderobe
      </Link>

      <div className="item-detail__layout">
        <div className="item-detail__media card">
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={item.name}
              className="item-detail__image"
            />
          ) : (
            <div
              className="item-detail__image item-detail__image--placeholder"
              aria-hidden="true"
            >
              Kein Bild
            </div>
          )}
        </div>

        <div className="item-detail__info">
          {editMode ? (
            <form className="item-detail__form" onSubmit={handleSave}>
              <div className="item-detail__field">
                <label className="label" htmlFor="item-name">
                  Name
                </label>
                <input
                  id="item-name"
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="item-detail__field">
                <label className="label" htmlFor="item-description">
                  Beschreibung
                </label>
                <textarea
                  id="item-description"
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="item-detail__field">
                <label className="label" htmlFor="item-color">
                  Farbe
                </label>
                <input
                  id="item-color"
                  className="input"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>

              <div className="item-detail__field">
                <label className="label" htmlFor="item-category">
                  Kategorie
                </label>
                <select
                  id="item-category"
                  className="input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Keine Kategorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="item-detail__field">
                <label className="label" htmlFor="item-image">
                  Bild ersetzen (optional)
                </label>
                <input
                  id="item-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Vorschau"
                    className="item-detail__preview"
                  />
                )}
              </div>

              {formError && (
                <p className="item-detail__error" role="alert">
                  {formError}
                </p>
              )}

              <div className="item-detail__actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Speichern…" : "Speichern"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div className="item-detail__details">
              <h1>{item.name}</h1>

              <div className="item-detail__badges">
                {categoryName ? (
                  <span className="badge">{categoryName}</span>
                ) : null}
                {item.color ? <span className="badge">{item.color}</span> : null}
              </div>

              {item.description ? (
                <p className="item-detail__description">{item.description}</p>
              ) : null}

              <div className="item-detail__meta">
                <div className="item-detail__meta-row">
                  <span className="item-detail__meta-label">Angelegt am</span>
                  <span className="item-detail__meta-value">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>

              <div className="item-detail__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={startEdit}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setConfirmOpen(true)}
                >
                  Löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title" className="modal__title">
              Kleidungsstück löschen?
            </h2>
            <p className="modal__text">
              Möchtest du „{item.name}“ wirklich löschen? Das kann nicht
              rückgängig gemacht werden.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmOpen(false)}
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
      )}
    </section>
  );
}
