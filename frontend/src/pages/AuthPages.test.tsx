import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";

const API = "http://localhost:8000";

function makeResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as Response;
}

function authResponse(email: string, token = "token-123"): Response {
  return makeResponse(200, {
    access_token: token,
    token_type: "bearer",
    user: { id: 1, email },
  });
}

function installFetch(
  handler: (
    method: string,
    path: string,
    body: unknown
  ) => Response | Promise<Response>
) {
  const fn = vi.fn(
    async (input: unknown, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const path = url.startsWith(API) ? url.slice(API.length) : url;
      let body: unknown = init?.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          // keep raw string
        }
      }
      return handler(init?.method ?? "GET", path, body);
    }
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

function seedAuthenticatedSession(email = "anna@example.com") {
  localStorage.setItem("auth_token", "token-123");
  localStorage.setItem("auth_user", JSON.stringify({ id: 1, email }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("meldet mit korrekten Daten an und leitet zur Garderobe weiter", async () => {
    installFetch((method, path) => {
      if (method === "POST" && path === "/api/auth/login") {
        return authResponse("anna@example.com");
      }
      return makeResponse(404, { detail: "not found" });
    });

    renderApp("/login");

    fireEvent.change(screen.getByLabelText("E-Mail"), {
      target: { value: "anna@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Garderobe" })
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("auth_token")).toBe("token-123");
  });

  it("zeigt bei falschen Zugangsdaten eine klare Fehlermeldung", async () => {
    installFetch((method, path) => {
      if (method === "POST" && path === "/api/auth/login") {
        return makeResponse(401, { detail: "Ungültige E-Mail oder Passwort" });
      }
      return makeResponse(404, { detail: "not found" });
    });

    renderApp("/login");

    fireEvent.change(screen.getByLabelText("E-Mail"), {
      target: { value: "anna@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "falsch123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "E-Mail oder Passwort ist falsch"
      );
    });
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});

describe("RegisterPage", () => {
  it("registriert einen neuen Benutzer und leitet zur Garderobe weiter", async () => {
    installFetch((method, path) => {
      if (method === "POST" && path === "/api/auth/register") {
        return makeResponse(201, {
          access_token: "token-456",
          token_type: "bearer",
          user: { id: 2, email: "neu@example.com" },
        });
      }
      return makeResponse(404, { detail: "not found" });
    });

    renderApp("/register");

    fireEvent.change(screen.getByLabelText("E-Mail"), {
      target: { value: "neu@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.change(screen.getByLabelText("Passwort bestätigen"), {
      target: { value: "geheim123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Garderobe" })
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("auth_token")).toBe("token-456");
  });

  it("zeigt einen Fehler, wenn die E-Mail bereits vergeben ist", async () => {
    installFetch((method, path) => {
      if (method === "POST" && path === "/api/auth/register") {
        return makeResponse(409, { detail: "E-Mail bereits vergeben" });
      }
      return makeResponse(404, { detail: "not found" });
    });

    renderApp("/register");

    fireEvent.change(screen.getByLabelText("E-Mail"), {
      target: { value: "anna@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.change(screen.getByLabelText("Passwort bestätigen"), {
      target: { value: "geheim123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Diese E-Mail-Adresse ist bereits vergeben"
      );
    });
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("validiert das Formular clientseitig vor dem Absenden", async () => {
    const fetchMock = installFetch(() => makeResponse(500, { detail: "boom" }));

    renderApp("/register");

    fireEvent.change(screen.getByLabelText("E-Mail"), {
      target: { value: "anna@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "geheim123" },
    });
    fireEvent.change(screen.getByLabelText("Passwort bestätigen"), {
      target: { value: "anders123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die Passwörter stimmen nicht überein"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Logout & Kontolöschung", () => {
  it("meldet den Benutzer ab und leitet zur Anmeldung weiter", async () => {
    seedAuthenticatedSession();
    installFetch((method, path) => {
      if (method === "POST" && path === "/api/auth/logout") {
        return makeResponse(204);
      }
      return makeResponse(404, { detail: "not found" });
    });

    renderApp("/konto");

    expect(screen.getByRole("heading", { name: "Konto" })).toBeInTheDocument();
    expect(screen.getByText("anna@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Anmelden" })
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("auth_user")).toBeNull();
  });

  it("löscht das Konto nach Bestätigung und leitet zur Registrierung weiter", async () => {
    seedAuthenticatedSession();
    installFetch((method, path) => {
      if (method === "DELETE" && path === "/api/auth/me") {
        return makeResponse(204);
      }
      return makeResponse(404, { detail: "not found" });
    });

    renderApp("/konto");

    fireEvent.click(screen.getByRole("button", { name: "Konto löschen" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Ja, endgültig löschen" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Ja, endgültig löschen" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Registrieren" })
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("auth_user")).toBeNull();
  });

  it("bricht die Löschung ab, wenn der Benutzer Abbrechen wählt", async () => {
    seedAuthenticatedSession();
    const fetchMock = installFetch(() => makeResponse(404, { detail: "not found" }));

    renderApp("/konto");

    fireEvent.click(screen.getByRole("button", { name: "Konto löschen" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(
      screen.getByRole("button", { name: "Konto löschen" })
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("auth_token")).toBe("token-123");
  });
});
