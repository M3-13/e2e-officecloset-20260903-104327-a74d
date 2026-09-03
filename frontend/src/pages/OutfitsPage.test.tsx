import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OutfitsPage from "./OutfitsPage";
import { ApiError } from "../api/client";
import { deleteOutfit, listOutfits } from "../api/outfits";
import type { OutfitOut } from "../api/outfits";
import type { ClothingItemOut } from "../api/wardrobe";

vi.mock("../api/outfits", () => ({
  listOutfits: vi.fn(),
  deleteOutfit: vi.fn(),
}));

vi.mock("../api/wardrobe", () => ({
  wardrobeImageUrl: vi.fn((id: number) =>
    `http://localhost:8000/api/wardrobe/${id}/image`
  ),
}));

const mockListOutfits = vi.mocked(listOutfits);
const mockDeleteOutfit = vi.mocked(deleteOutfit);

const redDress: ClothingItemOut = {
  id: 1,
  name: "Rotes Kleid",
  image_url: "/api/wardrobe/1/image",
  category_id: null,
  description: null,
  color: "rot",
  created_at: "2026-09-03T10:00:00Z",
};

const blackShoes: ClothingItemOut = {
  id: 2,
  name: "Schwarze Schuhe",
  image_url: "/api/wardrobe/2/image",
  category_id: null,
  description: null,
  color: null,
  created_at: "2026-09-03T10:00:00Z",
};

const outfits: OutfitOut[] = [
  {
    id: 1,
    name: "Gala-Auftritt",
    items: [redDress, blackShoes],
    created_at: "2026-09-03T11:00:00Z",
  },
  {
    id: 2,
    name: "Büro-Look",
    items: [redDress],
    created_at: "2026-09-03T12:00:00Z",
  },
];

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/outfits"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/outfits" element={<OutfitsPage />} />
        <Route
          path="/outfits/:id/edit"
          element={<div>Creator-Ansicht</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

async function waitForImagesToSettle() {
  await waitFor(() => {
    expect(
      document.querySelectorAll(".outfit-thumb--loading")
    ).toHaveLength(0);
  });
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
  mockListOutfits.mockResolvedValue(outfits);
  mockDeleteOutfit.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OutfitsPage", () => {
  it("zeigt gespeicherte Outfits mit ihren enthaltenen Teilen an", async () => {
    renderPage();

    expect(await screen.findByText("Gala-Auftritt")).toBeInTheDocument();
    expect(screen.getByText("Büro-Look")).toBeInTheDocument();

    expect(screen.getAllByText("Rotes Kleid").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Schwarze Schuhe")).toBeInTheDocument();

    await waitForImagesToSettle();
    expect(screen.getAllByRole("img", { name: "Rotes Kleid" }).length).toBeGreaterThanOrEqual(1);
  });

  it("zeigt den Ladezustand, solange geladen wird", () => {
    mockListOutfits.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText("Wird geladen…")).toBeInTheDocument();
  });

  it("zeigt einen Fehlerzustand, wenn das Laden fehlschlägt", async () => {
    mockListOutfits.mockRejectedValue(new ApiError(500, "Kaputt"));

    renderPage();

    expect(await screen.findByText("Fehler beim Laden")).toBeInTheDocument();
    expect(screen.getByText("Kaputt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Erneut versuchen" })
    ).toBeInTheDocument();
  });

  it("zeigt einen Leerzustand ohne Outfits", async () => {
    mockListOutfits.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Noch keine Outfits")).toBeInTheDocument();
  });

  it("verlinkt Bearbeiten zum Creator des jeweiligen Outfits", async () => {
    renderPage();

    await screen.findByText("Gala-Auftritt");

    const editLinks = screen.getAllByRole("link", {
      name: /bearbeiten/i,
    });
    expect(editLinks[0]).toHaveAttribute("href", "/outfits/1/edit");
    expect(editLinks[1]).toHaveAttribute("href", "/outfits/2/edit");

    fireEvent.click(editLinks[0]);
    expect(await screen.findByText("Creator-Ansicht")).toBeInTheDocument();
  });

  it("löscht ein Outfit nach Bestätigung", async () => {
    renderPage();

    await screen.findByText("Gala-Auftritt");

    const deleteButtons = screen.getAllByRole("button", { name: /löschen/i });
    fireEvent.click(deleteButtons[0]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Gala-Auftritt/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Löschen" }));

    await waitFor(() =>
      expect(mockDeleteOutfit).toHaveBeenCalledWith(1)
    );

    expect(await screen.findByText("Outfit wurde gelöscht.")).toBeInTheDocument();
    expect(screen.queryByText("Gala-Auftritt")).not.toBeInTheDocument();
    expect(screen.getByText("Büro-Look")).toBeInTheDocument();
  });

  it("bricht das Löschen ohne Bestätigung ab", async () => {
    renderPage();

    await screen.findByText("Gala-Auftritt");

    fireEvent.click(screen.getAllByRole("button", { name: /löschen/i })[0]);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Abbrechen" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockDeleteOutfit).not.toHaveBeenCalled();
    expect(screen.getByText("Gala-Auftritt")).toBeInTheDocument();
  });

  it("zeigt einen Fehler, wenn das Löschen fehlschlägt", async () => {
    mockDeleteOutfit.mockRejectedValue(new ApiError(500, "Löschen gescheitert"));

    renderPage();

    await screen.findByText("Gala-Auftritt");

    fireEvent.click(screen.getAllByRole("button", { name: /löschen/i })[0]);

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Löschen" }));

    expect(await screen.findByText("Löschen gescheitert")).toBeInTheDocument();
    expect(screen.getByText("Gala-Auftritt")).toBeInTheDocument();
  });
});
