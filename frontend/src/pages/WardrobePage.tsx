import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { ApiError, getToken } from "../api/client";
import { listCategories, type CategoryOut } from "../api/categories";
import {
  createWardrobeItem,
  listWardrobe,
  wardrobeImageUrl,
  type ClothingItemOut,
} from "../api/wardrobe";
import "./WardrobePage.css";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function toLower(value: string | null): string {
  return (value ?? "").toLowerCase();
}

function matchesQuery(item: ClothingItemOut, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    toLower(item.name).includes(q) ||
    toLower(item.description).includes(q) ||
    toLower(item.color).includes(q)
  );
}

function ItemImage({ item }: { item: ClothingItemOut }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const token = getToken();

    async function load() {
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
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.id]);

  if (url) {
    return (
      <img className="wardrobe-card__image" src={url} alt={item.name} />
    );
  }

  return (
    <div
      className={
        failed
          ? "wardrobe-card__image wardrobe-card__image--empty"
          : "wardrobe-card__image wardrobe-card__image--loading"
      }
      role="img"
      aria-label={failed ? "Bild nicht verfügbar" : item.name}
    />
  );
}

function WardrobeCard({
  item,
  categoryName,
}: {
  item: ClothingItemOut;
  categoryName: string | null;
}) {
  return (
    <Link to={`/wardrobe/${item.id}`} className="wardrobe-card">
      <ItemImage item={item} />
      <div className="wardrobe-card__body">
        <h3 className="wardrobe-card__name">{item.name}</h3>
        <div className="wardrobe-card__meta">
          <span className="wardrobe-card__category">
            {categoryName ?? "Ohne Kategorie"}
          </span>
          {item.color ? (
            <span className="wardrobe-card__color">{item.color}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItemOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setLoadError(null);
    void Promise.all([listWardrobe(), listCategories()])
      .then(([wardrobeItems, cats]) => {
        setItems(wardrobeItems);
        setCategories(cats);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError
            ? err.detail
            : "Die Garderobe konnte nicht geladen werden."
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

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory != null && item.category_id !== selectedCategory) {
        return false;
      }
      return query ? matchesQuery(item, query) : true;
    });
  }, [items, search, selectedCategory]);

  function openForm() {
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setName("");
    setCategoryId("");
    setDescription("");
    setColor("");
    setImage(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setFormError(null);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setImage(null);
    setPreview(null);
    setFormError(null);
    if (!file) {
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError("Ungültiger Dateityp. Erlaubt sind JPEG, PNG oder WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError("Das Bild ist zu groß (max. 5 MB).");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Bitte einen Namen angeben.");
      return;
    }
    if (!image) {
      setFormError("Bitte ein Bild auswählen.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createWardrobeItem({
        name: name.trim(),
        image,
        category_id: categoryId ? Number(categoryId) : undefined,
        description: description.trim() ? description.trim() : undefined,
        color: color.trim() ? color.trim() : undefined,
      });
      setItems((previous) => [created, ...previous]);
      closeForm();
      setToast("Teil wurde angelegt.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(
          err.status === 413
            ? "Das Bild ist zu groß (max. 5 MB)."
            : err.detail
        );
      } else {
        setFormError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <p className="wardrobe-status">Wird geladen…</p>
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
      <header className="wardrobe-header">
        <div>
          <h1>Garderobe</h1>
          <p className="wardrobe-header__subtitle">
            {items.length} {items.length === 1 ? "Teil" : "Teile"}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openForm}>
          Neues Teil
        </button>
      </header>

      <div className="wardrobe-toolbar">
        <div className="wardrobe-search">
          <input
            className="input"
            type="search"
            aria-label="Suchen"
            placeholder="Suchen (Name, Beschreibung, Farbe)…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div
          className="wardrobe-filters"
          role="group"
          aria-label="Nach Kategorie filtern"
        >
          <button
            type="button"
            className={selectedCategory == null ? "badge is-active" : "badge"}
            onClick={() => setSelectedCategory(null)}
          >
            Alle
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={
                selectedCategory === category.id ? "badge is-active" : "badge"
              }
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              ✦
            </div>
            <h2 className="empty-state__title">Noch keine Kleidungsstücke</h2>
            <p className="empty-state__desc">
              Lege dein erstes Teil an und baue deine Garderobe auf.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openForm}
            >
              Neues Teil
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              ✦
            </div>
            <h2 className="empty-state__title">Keine Treffer</h2>
            <p className="empty-state__desc">
              Kein Kleidungsstück passt zu Filter oder Suche.
            </p>
          </div>
        )
      ) : (
        <div className="gallery-grid">
          {visibleItems.map((item) => (
            <WardrobeCard
              key={item.id}
              item={item}
              categoryName={
                item.category_id != null
                  ? categoryNameById.get(item.category_id) ?? null
                  : null
              }
            />
          ))}
        </div>
      )}

      {showForm ? (
        <div
          className="modal-overlay"
          onClick={closeForm}
          role="presentation"
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-item-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="new-item-title">Neues Teil</h2>
            <form onSubmit={handleSubmit} noValidate>
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="form-field">
                <label className="label" htmlFor="item-name">
                  Name
                </label>
                <input
                  id="item-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="label" htmlFor="item-category">
                  Kategorie
                </label>
                <select
                  id="item-category"
                  className="input"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">Ohne Kategorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="label" htmlFor="item-description">
                  Beschreibung
                </label>
                <textarea
                  id="item-description"
                  className="input"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="label" htmlFor="item-color">
                  Farbe
                </label>
                <input
                  id="item-color"
                  className="input"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="label" htmlFor="item-image">
                  Bild
                </label>
                <input
                  id="item-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
                {preview ? (
                  <img
                    className="wardrobe-preview"
                    src={preview}
                    alt="Vorschau"
                  />
                ) : null}
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeForm}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Speichert…" : "Speichern"}
                </button>
              </div>
            </form>
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
