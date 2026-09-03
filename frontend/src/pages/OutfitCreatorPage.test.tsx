import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OutfitCreatorPage from "./OutfitCreatorPage";
import type { ClothingItemOut } from "../api/wardrobe";
import type { CategoryOut } from "../api/categories";
import type { OutfitOut } from "../api/outfits";

vi.mock("../api/wardrobe", () => ({
  listWardrobe: vi.fn(),
  wardrobeImageUrl: (id: number) =>
    `http://localhost:8000/api/wardrobe/${id}/image`,
}));

vi.mock("../api/categories", () => ({
  listCategories: vi.fn(),
}));

vi.mock("../api/outfits", () => ({
  createOutfit: vi.fn(),
  getOutfit: vi.fn(),
  updateOutfit: vi.fn(),
}));

import { listWardrobe } from "../api/wardrobe";
import { listCategories } from "../api/categories";
import { createOutfit, getOutfit, updateOutfit } from "../api/outfits";

const mockedListWardrobe = vi.mocked(listWardrobe);
const mockedListCategories = vi.mocked(listCategories);
const mockedCreateOutfit = vi.mocked(createOutfit);
const mockedGetOutfit = vi.mocked(getOutfit);
const mockedUpdateOutfit = vi.mocked(updateOutfit);

const itemOne: ClothingItemOut = {
  id: 1,
  name: "Schwarzes Kleid",
  image_url: "/api/wardrobe/1/image",
  category_id: 1,
  description: null,
  color: null,
  created_at: "2026-01-01T00:00:00",
};

const itemTwo: ClothingItemOut = {
  id: 2,
  name: "Rote Schuhe",
  image_url: "/api/wardrobe/2/image",
  category_id: 2,
  description: null,
  color: null,
  created_at: "2026-01-01T00:00:00",
};

const categories: CategoryOut[] = [
  { id: 1, name: "Kleider", item_count: 1 },
  { id: 2, name: "Schuhe", item_count: 1 },
];

const savedOutfit: OutfitOut = {
  id: 9,
  name: "Mein Outfit",
  items: [itemOne],
  created_at: "2026-01-01T00:00:00",
};

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={["/outfits/neu"]}>
      <Routes>
        <Route path="/outfits/neu" element={<OutfitCreatorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditPage() {
  return render(
    <MemoryRouter initialEntries={["/outfits/5/edit"]}>
      <Routes>
        <Route path="/outfits/:id/edit" element={<OutfitCreatorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("OutfitCreatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedListWardrobe.mockResolvedValue([itemOne, itemTwo]);
    mockedListCategories.mockResolvedValue(categories);
    mockedCreateOutfit.mockResolvedValue(savedOutfit);
    mockedGetOutfit.mockResolvedValue(savedOutfit);
    mockedUpdateOutfit.mockResolvedValue(savedOutfit);
  });

  it("wählt mehrere Teile aus und zeigt sie in der Vorschau", async () => {
    renderCreatePage();

    const first = await screen.findByRole("button", {
      name: "Schwarzes Kleid",
    });
    const second = screen.getByRole("button", { name: "Rote Schuhe" });

    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("0 Teile ausgewählt")).toBeInTheDocument();

    fireEvent.click(first);
    fireEvent.click(second);

    expect(screen.getByText("2 Teile ausgewählt")).toBeInTheDocument();
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", { name: "Schwarzes Kleid" })
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Rote Schuhe" })).toBeInTheDocument();

    fireEvent.click(first);

    expect(screen.getByText("1 Teil ausgewählt")).toBeInTheDocument();
    expect(first).toHaveAttribute("aria-pressed", "false");
  });

  it("speichert ein neues Outfit und zeigt eine Erfolgsmeldung", async () => {
    renderCreatePage();

    await screen.findByRole("button", { name: "Schwarzes Kleid" });
    fireEvent.click(screen.getByRole("button", { name: "Schwarzes Kleid" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Mein Outfit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(mockedCreateOutfit).toHaveBeenCalledWith("Mein Outfit", [1]);
    });
    expect(await screen.findByText("Outfit gespeichert.")).toBeInTheDocument();
  });

  it("befüllt das Formular beim Bearbeiten vor und aktualisiert das Outfit", async () => {
    mockedGetOutfit.mockResolvedValue({
      id: 5,
      name: "Altes Outfit",
      items: [itemOne],
      created_at: "2026-01-01T00:00:00",
    });
    renderEditPage();

    await waitFor(() => expect(mockedGetOutfit).toHaveBeenCalledWith(5));

    const nameInput = await screen.findByLabelText("Name");
    expect(nameInput).toHaveValue("Altes Outfit");
    expect(
      screen.getByRole("button", { name: "Schwarzes Kleid", pressed: true })
    ).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Neues Outfit" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(mockedUpdateOutfit).toHaveBeenCalledWith(5, "Neues Outfit", [1]);
    });
    expect(await screen.findByText("Outfit aktualisiert.")).toBeInTheDocument();
  });

  it("validiert, dass ein Name und mindestens ein Teil vorhanden sind", async () => {
    renderCreatePage();

    await screen.findByRole("button", { name: "Schwarzes Kleid" });

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(
      await screen.findByText("Bitte einen Namen für das Outfit eingeben.")
    ).toBeInTheDocument();
    expect(mockedCreateOutfit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Mein Outfit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(
      await screen.findByText(
        "Bitte mindestens ein Kleidungsstück auswählen."
      )
    ).toBeInTheDocument();
    expect(mockedCreateOutfit).not.toHaveBeenCalled();
  });

  it("zeigt einen Fehler, wenn die Garderobe nicht geladen werden kann", async () => {
    mockedListWardrobe.mockRejectedValue(new Error("Laden fehlgeschlagen"));
    renderCreatePage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Laden fehlgeschlagen");
  });

  it("zeigt einen Hinweis, wenn die Garderobe leer ist", async () => {
    mockedListWardrobe.mockResolvedValue([]);
    renderCreatePage();

    expect(
      await screen.findByText(/Deine Garderobe ist noch leer/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lege zuerst Kleidungsstücke an/ }))
      .toBeInTheDocument();
  });
});
