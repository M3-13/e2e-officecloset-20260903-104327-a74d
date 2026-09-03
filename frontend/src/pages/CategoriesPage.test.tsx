import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CategoriesPage from "./CategoriesPage";
import { ApiError } from "../api/client";
import {
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from "../api/categories";
import type { CategoryOut } from "../api/categories";

vi.mock("../api/categories", () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

const mockListCategories = vi.mocked(listCategories);
const mockCreateCategory = vi.mocked(createCategory);
const mockRenameCategory = vi.mocked(renameCategory);
const mockDeleteCategory = vi.mocked(deleteCategory);

const categories: CategoryOut[] = [
  { id: 1, name: "Kleider", item_count: 3 },
  { id: 2, name: "Anzüge", item_count: 1 },
];

function renderPage() {
  return render(<CategoriesPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue(categories);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CategoriesPage", () => {
  it("zeigt die Kategorien mit ihrer Teilanzahl an", async () => {
    renderPage();

    expect(await screen.findByText("Kleider")).toBeInTheDocument();
    expect(screen.getByText("3 Teile")).toBeInTheDocument();
    expect(screen.getByText("Anzüge")).toBeInTheDocument();
    expect(screen.getByText("1 Teil")).toBeInTheDocument();
  });

  it("zeigt den Ladezustand, solange geladen wird", () => {
    mockListCategories.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText("Wird geladen…")).toBeInTheDocument();
  });

  it("zeigt einen Fehlerzustand, wenn das Laden fehlschlägt", async () => {
    mockListCategories.mockRejectedValue(new ApiError(500, "Kaputt"));

    renderPage();

    expect(await screen.findByText("Fehler beim Laden")).toBeInTheDocument();
    expect(screen.getByText("Kaputt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Erneut versuchen" })
    ).toBeInTheDocument();
  });

  it("zeigt einen Leerzustand ohne Kategorien", async () => {
    mockListCategories.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Noch keine Kategorien")).toBeInTheDocument();
  });

  it("legt eine neue Kategorie an und zeigt sie sofort", async () => {
    mockCreateCategory.mockResolvedValue({
      id: 3,
      name: "Schuhe",
      item_count: 0,
    });

    renderPage();
    await screen.findByText("Kleider");

    fireEvent.click(screen.getByRole("button", { name: "Neue Kategorie" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Schuhe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith("Schuhe")
    );
    expect(await screen.findByText("Schuhe")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Kategorie wurde angelegt."
    );
  });

  it("verlangt einen Namen vor dem Anlegen", async () => {
    renderPage();
    await screen.findByText("Kleider");

    fireEvent.click(screen.getByRole("button", { name: "Neue Kategorie" }));
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Bitte einen Namen/
    );
    expect(mockCreateCategory).not.toHaveBeenCalled();
  });

  it("benennt eine Kategorie um", async () => {
    mockRenameCategory.mockResolvedValue({
      id: 1,
      name: "Abendkleider",
      item_count: 3,
    });

    renderPage();
    await screen.findByText("Kleider");

    fireEvent.click(
      screen.getByRole("button", { name: "Umbenennen Kleider" })
    );

    const input = screen.getByLabelText("Name");
    expect(input).toHaveValue("Kleider");

    fireEvent.change(input, { target: { value: "Abendkleider" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() =>
      expect(mockRenameCategory).toHaveBeenCalledWith(1, "Abendkleider")
    );
    expect(await screen.findByText("Abendkleider")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Kategorie wurde umbenannt."
    );
  });

  it("löscht eine Kategorie nach Bestätigung", async () => {
    mockDeleteCategory.mockResolvedValue(undefined);

    renderPage();
    await screen.findByText("Kleider");

    fireEvent.click(screen.getByRole("button", { name: "Löschen Kleider" }));

    expect(screen.getByText(/bleiben erhalten/)).toBeInTheDocument();
    expect(screen.getByText(/unkategorisiert/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(mockDeleteCategory).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByText("Kleider")).not.toBeInTheDocument()
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Kategorie wurde gelöscht."
    );
  });

  it("löscht nicht, wenn die Bestätigung abgebrochen wird", async () => {
    renderPage();
    await screen.findByText("Kleider");

    fireEvent.click(screen.getByRole("button", { name: "Löschen Kleider" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(mockDeleteCategory).not.toHaveBeenCalled();
    expect(screen.getByText("Kleider")).toBeInTheDocument();
  });
});
