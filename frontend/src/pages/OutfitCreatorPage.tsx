import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { listCategories, type CategoryOut } from "../api/categories";
import { createOutfit, getOutfit, updateOutfit } from "../api/outfits";
import {
  listWardrobe,
  wardrobeImageUrl,
  type ClothingItemOut,
} from "../api/wardrobe";
import styles from "./OutfitCreatorPage.module.css";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.";
}

export default function OutfitCreatorPage() {
  const { id } = useParams<{ id: string }>();
  const editId = id ? Number(id) : null;
  const isEditing = editId != null;

  const [items, setItems] = useState<ClothingItemOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [wardrobeItems, cats] = await Promise.all([
          listWardrobe(),
          listCategories(),
        ]);
        if (cancelled) return;
        setItems(wardrobeItems);
        setCategories(cats);

        if (editId != null) {
          const outfit = await getOutfit(editId);
          if (cancelled) return;
          setName(outfit.name);
          setSelectedIds(outfit.items.map((item) => item.id));
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const filteredItems = useMemo(() => {
    if (filterCategory == null) return items;
    return items.filter((item) => item.category_id === filterCategory);
  }, [items, filterCategory]);

  const selectedItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return selectedIds
      .map((selectedId) => byId.get(selectedId))
      .filter((item): item is ClothingItemOut => item != null);
  }, [items, selectedIds]);

  function toggleItem(itemId: number) {
    setSelectedIds((previous) =>
      previous.includes(itemId)
        ? previous.filter((selectedId) => selectedId !== itemId)
        : [...previous, itemId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Bitte einen Namen für das Outfit eingeben.");
      setSuccess(null);
      return;
    }
    if (selectedIds.length === 0) {
      setError("Bitte mindestens ein Kleidungsstück auswählen.");
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (isEditing && editId != null) {
        await updateOutfit(editId, trimmedName, selectedIds);
        setSuccess("Outfit aktualisiert.");
      } else {
        await createOutfit(trimmedName, selectedIds);
        setSuccess("Outfit gespeichert.");
        setName("");
        setSelectedIds([]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const title = isEditing ? "Outfit bearbeiten" : "Outfit-Creator";
  const subtitle = isEditing
    ? "Passe die Teile und den Namen deines Outfits an."
    : "Kombiniere deine Kleidungsstücke zu einem neuen Outfit.";
  const selectedCountLabel = `${selectedIds.length} ${
    selectedIds.length === 1 ? "Teil" : "Teile"
  } ausgewählt`;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      {loading ? (
        <p role="status" className={styles.loading}>
          Wird geladen…
        </p>
      ) : error != null && items.length === 0 ? (
        <div role="alert" className={`${styles.feedback} ${styles.feedbackError}`}>
          {error}
        </div>
      ) : (
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          {error != null && (
            <div role="alert" className={`${styles.feedback} ${styles.feedbackError}`}>
              {error}
            </div>
          )}
          {success != null && (
            <div
              role="status"
              className={`${styles.feedback} ${styles.feedbackSuccess}`}
            >
              {success}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="outfit-name" className="label">
              Name
            </label>
            <input
              id="outfit-name"
              className="input"
              type="text"
              value={name}
              placeholder="z. B. Abendlook"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Kleidungsstücke auswählen</h2>

            {categories.length > 0 && (
              <div className={styles.filterRow}>
                <button
                  type="button"
                  className={
                    filterCategory == null
                      ? `${styles.chip} ${styles.chipActive}`
                      : styles.chip
                  }
                  aria-pressed={filterCategory == null}
                  onClick={() => setFilterCategory(null)}
                >
                  Alle
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={
                      filterCategory === category.id
                        ? `${styles.chip} ${styles.chipActive}`
                        : styles.chip
                    }
                    aria-pressed={filterCategory === category.id}
                    onClick={() => setFilterCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            <p className={styles.count}>{selectedCountLabel}</p>

            {items.length === 0 ? (
              <p className={styles.empty}>
                Deine Garderobe ist noch leer.{" "}
                <Link to="/wardrobe">Lege zuerst Kleidungsstücke an.</Link>
              </p>
            ) : filteredItems.length === 0 ? (
              <p className={styles.empty}>
                Keine Kleidungsstücke in dieser Kategorie.
              </p>
            ) : (
              <div className={styles.grid}>
                {filteredItems.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        selected
                          ? `${styles.item} ${styles.itemSelected}`
                          : styles.item
                      }
                      aria-pressed={selected}
                      aria-label={item.name}
                      onClick={() => toggleItem(item.id)}
                    >
                      <img
                        className={styles.itemImage}
                        src={wardrobeImageUrl(item.id)}
                        alt=""
                      />
                      {selected && (
                        <span className={styles.check} aria-hidden="true">
                          ✓
                        </span>
                      )}
                      <span className={styles.itemName}>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className={styles.sectionHeading}>Vorschau</h2>
            {selectedItems.length === 0 ? (
              <p className={styles.empty}>
                Noch keine Teile ausgewählt. Wähle oben mindestens ein
                Kleidungsstück aus.
              </p>
            ) : (
              <ul className={styles.preview}>
                {selectedItems.map((item) => (
                  <li key={item.id} className={styles.previewItem}>
                    <img
                      className={styles.previewImage}
                      src={wardrobeImageUrl(item.id)}
                      alt={item.name}
                    />
                    <span className={styles.previewName}>{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </button>
            <Link to="/outfits" className="btn btn-secondary">
              Abbrechen
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
