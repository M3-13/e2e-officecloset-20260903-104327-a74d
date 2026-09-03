import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import ImpressumPage from "./ImpressumPage";
import DatenschutzPage from "./DatenschutzPage";

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

describe("ImpressumPage", () => {
  it("rendert den vollständigen Impressumstext", () => {
    render(<ImpressumPage />);

    expect(
      screen.getByRole("heading", { name: "Impressum" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Angaben gemäß § 5 TMG/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Anbieter" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Haftung für Inhalte" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Haftung für Links" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Urheberrecht" })
    ).toBeInTheDocument();
  });
});

describe("DatenschutzPage", () => {
  it("rendert die vollständige Datenschutzerklärung", () => {
    render(<DatenschutzPage />);

    expect(
      screen.getByRole("heading", { name: "Datenschutzerklärung" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Welche Daten gespeichert werden" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Keine Drittanbieter-Ressourcen" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Löschung Ihrer Daten" })
    ).toBeInTheDocument();
    expect(screen.getByText(/„Konto löschen“/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ihre Rechte" })
    ).toBeInTheDocument();
  });
});

describe("Erreichbarkeit über den Footer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("erreicht das Impressum über den Footer", () => {
    renderApp("/");

    fireEvent.click(screen.getByRole("link", { name: "Impressum" }));

    expect(
      screen.getByRole("heading", { name: "Impressum" })
    ).toBeInTheDocument();
  });

  it("erreicht die Datenschutzerklärung über den Footer", () => {
    renderApp("/");

    fireEvent.click(screen.getByRole("link", { name: "Datenschutz" }));

    expect(
      screen.getByRole("heading", { name: "Datenschutzerklärung" })
    ).toBeInTheDocument();
  });
});
