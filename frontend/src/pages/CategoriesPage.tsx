import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  type CategoryOut,
} from "../api/categories";
import "./CategoriesPage.css";

type ModalState =
  | { mode: "create" }
  | { mode: "rename"; category: CategoryOut }
  | { mode: "delete"; category: CategoryOut }
  | null;

function itemCountLabel(count: number): string {
  return `${count} ${count === 1 ? "Teil" : "Teile"}`;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setLoadError(null);
    void listCategories()
      .then((cats) => {
        setCategories(cats);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError
            ? err.detail
            : "Die Kategorien konnten nicht geladen werden."
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

  function openCreate() {
    setName("");
    setFormError(null);
    setModal({ mode: "create" });
  }

  function openRename(category: CategoryOut) {
    setName(category.name);
    setFormError(null);
    setModal({ mode: "rename", category });
  }

  function openDelete(category: CategoryOut) {
    setModal({ mode: "delete", category });
  }

  function closeModal() {
    setModal(null);
    setName("");
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Bitte einen Namen angeben.");
      return;
    }

    setSubmitting(true);
    try {
      if (modal?.mode === "rename") {
        const updated = await renameCategory(modal.category.id, trimmed);
        setCategories((previous) =>
          previous.map((category) =>
            category.id === updated.id ? updated : category
          )
        );
        setToast("Kategorie wurde umbenannt.");
      } else {
        const created = await createCategory(trimmed);
        setCategories((previous) => [...previous, created]);
        setToast("Kategorie wurde angelegt.");
      }
      closeModal();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.detail);
      } else {
        setFormError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (modal?.mode !== "delete") {
      return;
    }
    setDeleting(true);
    try {
      await deleteCategory(modal.category.id);
      setCategories((previous) =>
        previous.filter((category) => category.id !== modal.category.id)
      );
      setToast("Kategorie wurde gelöscht.");
      closeModal();
    } catch (err: unknown) {
      setFormError(
        err instanceof ApiError
          ? err.detail
          : "Löschen fehlgeschlagen. Bitte erneut versuchen."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <p className="categories-status">Wird geladen…</p>
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
      <header className="categories-header">
        <div>
          <h1>Kategorien</h1>
          <p className="categories-header__subtitle">
            {categories.length}{" "}
            {categories.length === 1 ? "Kategorie" : "Kategorien"}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Neue Kategorie
        </button>
      </header>

      {categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">
            ✦
          </div>
          <h2 className="empty-state__title">Noch keine Kategorien</h2>
          <p className="empty-state__desc">
            Lege deine erste Kategorie an, um deine Garderobe zu ordnen.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
          >
            Neue Kategorie
          </button>
        </div>
      ) : (
        <ul className="categories-list">
          {categories.map((category) => (
            <li key={category.id} className="category-row">
              <div className="category-row__info">
                <span className="category-row__name">{category.name}</span>
                <span className="category-row__count">
                  {itemCountLabel(category.item_count)}
                </span>
              </div>
              <div className="category-row__actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => openRename(category)}
                  aria-label={`Umbenennen ${category.name}`}
                >
                  Umbenennen
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => openDelete(category)}
                  aria-label={`Löschen ${category.name}`}
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && modal.mode !== "delete" ? (
        <div className="modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="category-form-title">
              {modal.mode === "rename"
                ? "Kategorie umbenennen"
                : "Neue Kategorie"}
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="form-field">
                <label className="label" htmlFor="category-name">
                  Name
                </label>
                <input
                  id="category-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Speichert…"
                    : modal.mode === "rename"
                      ? "Speichern"
                      : "Anlegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modal && modal.mode === "delete" ? (
        <div className="modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="category-delete-title">Kategorie löschen</h2>
            {formError ? (
              <p className="form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <p className="confirm-note">
              „{modal.category.name}“ wirklich löschen? Die betroffenen
              Kleidungsstücke bleiben erhalten und erscheinen anschließend als
              unkategorisiert.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Löscht…" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
