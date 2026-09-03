import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ItemDetailPage from "./ItemDetailPage";
import type { CategoryOut } from "../api/categories";
import type { ClothingItemOut } from "../api/wardrobe";

const item: ClothingItemOut = {
  id: 1,
  name: "Rotes Abendkleid",
  image_url: "/api/wardrobe/1/image",
  category_id: null,
  description: "Ein elegantes Kleid",
  color: "Rot",
  created_at: "2026-01-01T00:00:00",
};

const categories: CategoryOut[] = [
  { id: 1, name: "Kleider", item_count: 3 },
  { id: 2, name: "Schuhe", item_count: 1 },
];

const fetchMock = vi.fn();
const captured: { url: string; method: string; body: BodyInit | null }[] = [];

function fakeResponse(status: number, body?: string): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body ?? "",
    json: async () => (body ? JSON.parse(body) : null),
    blob: async () => new Blob([body ?? ""]),
  } as unknown as Response;
}

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock);
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
  captured.length = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
      captured.push({ url, method, body: (init?.body as BodyInit) ?? null });

      if (method === "GET" && path === "/api/categories") {
        return fakeResponse(200, JSON.stringify(categories));
      }
      if (method === "GET" && path === "/api/wardrobe/1/image") {
        return fakeResponse(200, "image-bytes");
      }
      if (method === "GET" && path === "/api/wardrobe/1") {
        return fakeResponse(200, JSON.stringify(item));
      }
      if (method === "PATCH" && path === "/api/wardrobe/1") {
        const form = init?.body as FormData;
        const nextName = form.get("name");
        return fakeResponse(
          200,
          JSON.stringify({
            ...item,
            name: typeof nextName === "string" ? nextName : item.name,
          })
        );
      }
      if (method === "DELETE" && path === "/api/wardrobe/1") {
        return fakeResponse(204);
      }
      return fakeResponse(404, JSON.stringify({ detail: "Nicht gefunden" }));
    }
  );
});

function renderDetail(id = "1") {
  return render(
    <MemoryRouter
      initialEntries={[`/wardrobe/${id}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/wardrobe/:id" element={<ItemDetailPage />} />
        <Route path="/wardrobe" element={<div>Galerie-Ansicht</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ItemDetailPage", () => {
  it("lädt das Kleidungsstück und zeigt Bild und Details", async () => {
    renderDetail();

    expect(
      await screen.findByRole("heading", { name: "Rotes Abendkleid" })
    ).toBeInTheDocument();
    expect(screen.getByText("Ein elegantes Kleid")).toBeInTheDocument();
    expect(screen.getByText("Rot")).toBeInTheDocument();
    expect(
      await screen.findByRole("img", { name: "Rotes Abendkleid" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bearbeiten" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();
  });

  it("bearbeitet das Kleidungsstück und zeigt die Änderung sofort", async () => {
    renderDetail();

    await screen.findByRole("heading", { name: "Rotes Abendkleid" });

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Blaues Kleid" } });

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(
      await screen.findByRole("heading", { name: "Blaues Kleid" })
    ).toBeInTheDocument();

    const patch = captured.find((call) => call.method === "PATCH");
    expect(patch).toBeDefined();
    expect((patch!.body as FormData).get("name")).toBe("Blaues Kleid");
  });

  it("tauscht das Bild beim Bearbeiten aus", async () => {
    renderDetail();

    await screen.findByRole("heading", { name: "Rotes Abendkleid" });

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    const fileInput = screen.getByLabelText(
      "Bild ersetzen (optional)"
    ) as HTMLInputElement;
    const file = new File(["neues-bild"], "neues-bild.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      const patch = captured.find((call) => call.method === "PATCH");
      expect(patch).toBeDefined();
      const sentImage = (patch!.body as FormData).get("image");
      expect(sentImage).toBeInstanceOf(File);
      expect((sentImage as File).name).toBe("neues-bild.jpg");
    });
  });

  it("löscht das Kleidungsstück nach Bestätigung und kehrt zur Galerie zurück", async () => {
    renderDetail();

    await screen.findByRole("heading", { name: "Rotes Abendkleid" });

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Rotes Abendkleid/)
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Löschen" }));

    expect(await screen.findByText("Galerie-Ansicht")).toBeInTheDocument();

    const del = captured.find((call) => call.method === "DELETE");
    expect(del).toBeDefined();
  });

  it("zeigt eine Meldung, wenn das Kleidungsstück nicht gefunden wird", async () => {
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const method = init?.method ?? "GET";
        const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
        if (method === "GET" && path === "/api/categories") {
          return fakeResponse(200, JSON.stringify([]));
        }
        return fakeResponse(404, JSON.stringify({ detail: "Nicht gefunden" }));
      }
    );

    renderDetail("999");

    expect(await screen.findByText("Nicht gefunden")).toBeInTheDocument();
  });
});
