import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WardrobePage from "./WardrobePage";
import { ApiError } from "../api/client";
import { listWardrobe, createWardrobeItem } from "../api/wardrobe";
import { listCategories } from "../api/categories";
import type { ClothingItemOut } from "../api/wardrobe";
import type { CategoryOut } from "../api/categories";

vi.mock("../api/wardrobe", () => ({
  listWardrobe: vi.fn(),
  createWardrobeItem: vi.fn(),
  wardrobeImageUrl: (id: number) =>
    `http://localhost:8000/api/wardrobe/${id}/image`,
}));

vi.mock("../api/categories", () => ({
  listCategories: vi.fn(),
}));

const mockListWardrobe = vi.mocked(listWardrobe);
const mockListCategories = vi.mocked(listCategories);
const mockCreateWardrobeItem = vi.mocked(createWardrobeItem);

const items: ClothingItemOut[] = [
  {
    id: 1,
    name: "Rotes Kleid",
    image_url: "",
    category_id: 1,
    description: "Eleganz pur",
    color: "rot",
    created_at: "2026-09-03T10:00:00Z",
  },
  {
    id: 2,
    name: "Schwarzer Anzug",
    image_url: "",
    category_id: 2,
    description: null,
    color: "schwarz",
    created_at: "2026-09-03T10:00:00Z",
  },
  {
    id: 3,
    name: "Seidenschal",
    image_url: "",
    category_id: null,
    description: "weich und fliessend",
    color: "beige",
    created_at: "2026-09-03T10:00:00Z",
  },
];

const categories: CategoryOut[] = [
  { id: 1, name: "Kleider", item_count: 1 },
  { id: 2, name: "Anzüge", item_count: 1 },
];

function renderPage() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <WardrobePage />
    </MemoryRouter>
  );
}

async function waitForImagesToSettle() {
  await waitFor(() => {
    expect(
      document.querySelectorAll(".wardrobe-card__image--loading")
    ).toHaveLength(0);
  });
}

function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL =
    vi.fn(() => "blob:mock");
  (
    URL as unknown as { revokeObjectURL: (url: string) => void }
  ).revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(["x"], { type: "image/png" }),
    }))
  );
  mockListWardrobe.mockResolvedValue(items);
  mockListCategories.mockResolvedValue(categories);
  mockCreateWardrobeItem.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WardrobePage", () => {
  it("lädt und zeigt alle Kleidungsstücke in der Galerie", async () => {
    renderPage();

    expect(await screen.findByText("Rotes Kleid")).toBeInTheDocument();
    expect(screen.getByText("Schwarzer Anzug")).toBeInTheDocument();
    expect(screen.getByText("Seidenschal")).toBeInTheDocument();
  });

  it("zeigt den Ladezustand, solange geladen wird", () => {
    mockListWardrobe.mockReturnValue(new Promise(() => {}));
    mockListCategories.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText("Wird geladen…")).toBeInTheDocument();
  });

  it("zeigt einen Fehlerzustand, wenn das Laden fehlschlägt", async () => {
    mockListWardrobe.mockRejectedValue(new ApiError(500, "Kaputt"));

    renderPage();

    expect(await screen.findByText("Fehler beim Laden")).toBeInTheDocument();
    expect(screen.getByText("Kaputt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Erneut versuchen" })).toBeInTheDocument();
  });

  it("zeigt einen Leerzustand ohne Kleidungsstücke", async () => {
    mockListWardrobe.mockResolvedValue([]);
    mockListCategories.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText("Noch keine Kleidungsstücke")
    ).toBeInTheDocument();
  });

  it("filtert die Galerie nach Kategorie", async () => {
    renderPage();
    await screen.findByText("Rotes Kleid");
    await waitForImagesToSettle();

    fireEvent.click(screen.getByRole("button", { name: "Kleider" }));

    expect(screen.getByText("Rotes Kleid")).toBeInTheDocument();
    expect(screen.queryByText("Schwarzer Anzug")).not.toBeInTheDocument();
    expect(screen.queryByText("Seidenschal")).not.toBeInTheDocument();
  });

  it("grenzt die Galerie per Suchtext über Name, Beschreibung und Farbe ein", async () => {
    renderPage();
    await screen.findByText("Rotes Kleid");
    await waitForImagesToSettle();

    const searchInput = screen.getByLabelText("Suchen");

    fireEvent.change(searchInput, { target: { value: "schwarz" } });
    expect(screen.getByText("Schwarzer Anzug")).toBeInTheDocument();
    expect(screen.queryByText("Rotes Kleid")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "eleganz" } });
    expect(screen.getByText("Rotes Kleid")).toBeInTheDocument();
    expect(screen.queryByText("Schwarzer Anzug")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "beige" } });
    expect(screen.getByText("Seidenschal")).toBeInTheDocument();
    expect(screen.queryByText("Rotes Kleid")).not.toBeInTheDocument();

    await waitForImagesToSettle();
  });

  it("legt ein neues Teil an und zeigt es sofort in der Galerie", async () => {
    const created: ClothingItemOut = {
      id: 9,
      name: "Blaue Bluse",
      image_url: "",
      category_id: 1,
      description: null,
      color: "blau",
      created_at: "2026-09-03T11:00:00Z",
    };
    mockCreateWardrobeItem.mockResolvedValue(created);

    renderPage();
    await screen.findByText("Rotes Kleid");

    fireEvent.click(screen.getByRole("button", { name: "Neues Teil" }));

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Blaue Bluse" },
    });
    fireEvent.change(screen.getByLabelText("Kategorie"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Farbe"), {
      target: { value: "blau" },
    });

    const file = new File(["img"], "bluse.png", { type: "image/png" });
    selectFile(screen.getByLabelText("Bild") as HTMLInputElement, file);
    expect(screen.getByAltText("Vorschau")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(mockCreateWardrobeItem).toHaveBeenCalledTimes(1));
    expect(mockCreateWardrobeItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Blaue Bluse",
        category_id: 1,
        color: "blau",
        image: file,
      })
    );

    expect(await screen.findByText("Blaue Bluse")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Teil wurde angelegt.");
  });

  it("weist einen ungültigen Dateityp clientseitig ab", async () => {
    renderPage();
    await screen.findByText("Rotes Kleid");

    fireEvent.click(screen.getByRole("button", { name: "Neues Teil" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Dokument" },
    });

    const file = new File(["x"], "doc.txt", { type: "text/plain" });
    selectFile(screen.getByLabelText("Bild") as HTMLInputElement, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Ungültiger Dateityp/
    );
    expect(mockCreateWardrobeItem).not.toHaveBeenCalled();
  });

  it("weist eine zu große Datei clientseitig ab", async () => {
    renderPage();
    await screen.findByText("Rotes Kleid");

    fireEvent.click(screen.getByRole("button", { name: "Neues Teil" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Riesig" },
    });

    const bigFile = new File(["x".repeat(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    selectFile(screen.getByLabelText("Bild") as HTMLInputElement, bigFile);

    expect(await screen.findByRole("alert")).toHaveTextContent(/zu groß/);
    expect(mockCreateWardrobeItem).not.toHaveBeenCalled();
  });

  it("zeigt einen Serverfehler 413 beim Anlegen an", async () => {
    mockCreateWardrobeItem.mockRejectedValue(new ApiError(413, "too large"));

    renderPage();
    await screen.findByText("Rotes Kleid");

    fireEvent.click(screen.getByRole("button", { name: "Neues Teil" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Neues Teil" },
    });
    const file = new File(["img"], "x.png", { type: "image/png" });
    selectFile(screen.getByLabelText("Bild") as HTMLInputElement, file);

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /zu groß \(max\. 5 MB\)/
    );
  });

  it("zeigt einen Serverfehler 400 beim Anlegen an", async () => {
    mockCreateWardrobeItem.mockRejectedValue(
      new ApiError(400, "Ungültiger Dateityp")
    );

    renderPage();
    await screen.findByText("Rotes Kleid");

    fireEvent.click(screen.getByRole("button", { name: "Neues Teil" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Neues Teil" },
    });
    const file = new File(["img"], "x.png", { type: "image/png" });
    selectFile(screen.getByLabelText("Bild") as HTMLInputElement, file);

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ungültiger Dateityp"
    );
  });

  it("verlangt einen Namen vor dem Speichern", async () => {
    renderPage();
    await screen.findByText("Rotes Kleid");

    fireEvent.click(screen.getByRole("button", { name: "Neues Teil" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Bitte einen Namen/
    );
    expect(mockCreateWardrobeItem).not.toHaveBeenCalled();
  });
});
