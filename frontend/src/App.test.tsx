import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

function renderApp(initialPath = "/") {
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

describe("App-Shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rendert die Navigation mit allen Links", () => {
    renderApp("/wardrobe");

    expect(screen.getByRole("link", { name: "Garderobe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kategorien" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Outfit-Creator" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Outfits" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Konto" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Logout" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impressum" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Datenschutz" })
    ).toBeInTheDocument();
  });

  it("leitet unauthentifiziert / auf /login um", () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: "Anmelden" })
    ).toBeInTheDocument();
  });
});
