import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/wardrobe", label: "Garderobe" },
  { to: "/kategorien", label: "Kategorien" },
  { to: "/outfits/neu", label: "Outfit-Creator" },
  { to: "/outfits", label: "Outfits" },
  { to: "/konto", label: "Konto" },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="container nav__inner">
          <Link to="/" className="nav__brand">
            <span className="nav__brand-mark" aria-hidden="true" />
            Red Carpet Wardrobe
          </Link>
          <nav className="nav__links" aria-label="Hauptnavigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav__link is-active" : "nav__link"
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              className="nav__link"
              onClick={() => void logout()}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="container app-main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <Link to="/impressum">Impressum</Link>
          <Link to="/datenschutz">Datenschutz</Link>
        </div>
      </footer>
    </div>
  );
}
