# Glamouröser Kleiderschrank-Manager mit Outfit-Creator

Eine Web-App im Hollywood-Red-Carpet-Stil: Benutzer registrieren sich, verwalten
Kleidungsstücke mit Bildern und frei anlegbaren Kategorien, durchstöbern ihre
Garderobe (Filter + Suche) und kombinieren Einzelteile im Outfit-Creator zu
gespeicherten Outfits. Die Optik ist dunkel mit warmen Champagner-Gold-Akzenten.

## Tech-Stack

- **Backend**: Python (FastAPI), SQLAlchemy ORM, SQLite
- **Auth**: JWT (Bearer Token), Passwort-Hashing mit bcrypt
- **Storage**: lokaler Upload-Ordner, ausgeliefert über eine geschützte Route
- **Frontend**: Vite + React (TypeScript) mit Custom-CSS im Red-Carpet-Stil

## Installation

Voraussetzung: Python 3.13+ (und für das Frontend Node.js 22+).

```bash
cd backend
python -m pip install -r requirements.txt
```

## Starten (Entwicklung)

Die Anwendung wird über `RUN.json` im Repo-Root gestartet — das ist der
maschinell ausführbare Startvertrag, den auch CI und Test-Runner verwenden.
Ein gemeinsamer Start erfolgt über den office-eigenen Runner:

```bash
py _office_run_check.py
```

Alternativ direkt mit Uvicorn (aus dem `backend/`-Verzeichnis). Der Signaturschlüssel
`JWT_SECRET` wird vom Runner pro Lauf erzeugt; für einen manuellen Start exportierst
du ihn selbst (oder übernimmst ihn aus `.env.example`), damit Tokens Neustarts überleben:

```bash
cd backend
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_hex(32))')"
python -m uvicorn app.main:app --port 8000
```

Unter Windows (PowerShell):

```powershell
cd backend
$env:JWT_SECRET = python -c "import secrets; print(secrets.token_hex(32))"
python -m uvicorn app.main:app --port 8000
```

Beim Start werden automatisch das Datenbank-Schema und das Upload-Verzeichnis
angelegt — es ist keine manuelle Migration oder Einrichtung nötig.

## Umgebungsvariablen

| Variable             | Default                          | Bedeutung                                   |
| -------------------- | -------------------------------- | ------------------------------------------- |
| `DATABASE_URL`       | `sqlite:///./backend/data/app.db` | Datenbank-URL                              |
| `UPLOAD_DIR`         | `./backend/uploads`              | Verzeichnis für hochgeladene Bilder         |
| `FRONTEND_ORIGIN`    | `http://localhost:5173`          | Erlaubte CORS-Origin des Frontends          |
| `JWT_SECRET`         | zufällig generiert               | Signaturschlüssel für JWTs (in RUN.json)    |
| `JWT_EXPIRES_MINUTES`| `60`                             | Gültigkeitsdauer der Tokens                 |

`JWT_SECRET` wird in `RUN.json` pro Lauf neu erzeugt (`generate`) und liegt
niemals im Repository. Für lokale Entwicklung ohne Runner wird er beim Start
automatisch generiert.

## API-Endpunkte

Basis-URL: `http://localhost:8000`. Authentifizierung über
`Authorization: Bearer <token>`. Fehlerantworten nutzen einheitlich `{"detail": "..."}`.

### Health

- `GET /api/health` → `200 {"status": "ok"}`

### Auth

- `POST /api/auth/register` `{"email": str, "password": str}` → `201`
  `{"access_token": str, "token_type": "bearer", "user": UserOut}`; `409` wenn E-Mail vergeben, `422` bei Validierungsfehlern
- `POST /api/auth/login` `{"email": str, "password": str}` → `200` Token; `401` bei falschen Daten
- `POST /api/auth/logout` → `204`
- `GET /api/auth/me` → `200` UserOut
- `DELETE /api/auth/me` → `204` (löscht Konto inkl. aller Daten/Bilder)

### Kategorien

- `GET /api/categories` → `200` `[CategoryOut]`
- `POST /api/categories` `{"name": str}` → `201` CategoryOut
- `PATCH /api/categories/{id}` `{"name": str}` → `200` CategoryOut
- `DELETE /api/categories/{id}` → `204` (Items bleiben, `category_id=null`)

### Garderobe

- `GET /api/wardrobe?category_id=&q=` → `200` `[ClothingItemOut]`
- `POST /api/wardrobe` (multipart: `name` Pflicht, `image` Pflicht, `category_id`, `description`, `color`) → `201` ClothingItemOut; `400` ungültiger Typ, `413` >5 MB
- `GET /api/wardrobe/{id}` → `200` ClothingItemOut
- `PATCH /api/wardrobe/{id}` (multipart, alle Felder optional) → `200` ClothingItemOut
- `DELETE /api/wardrobe/{id}` → `204` (löscht auch die Bilddatei)
- `GET /api/wardrobe/{id}/image` → `200` `image/jpeg|png|webp` (nur Besitzer)

### Outfits

- `GET /api/outfits` → `200` `[OutfitOut]`
- `POST /api/outfits` `{"name": str, "item_ids": [int]}` → `201` OutfitOut; fremde `item_ids` → `400`/`404`
- `GET /api/outfits/{id}` → `200` OutfitOut
- `PATCH /api/outfits/{id}` `{"name": str, "item_ids": [int]}` → `200` OutfitOut
- `DELETE /api/outfits/{id}` → `204`

### Datenformen

- `UserOut` `{id: int, email: str}`
- `CategoryOut` `{id: int, name: str, item_count: int}`
- `ClothingItemOut` `{id: int, name: str, image_url: str, category_id: int|null, description: str|null, color: str|null, created_at: str}`
- `OutfitOut` `{id: int, name: str, items: [ClothingItemOut], created_at: str}`

## Features

- Registrierung & Login (JWT + bcrypt), Logout, Kontolöschung mit vollständiger Bereinigung
- Garderobe: Anlegen mit Bild-Upload, Filtern nach Kategorie, Volltextsuche, Bearbeiten & Löschen
- Freie Kategorien (anlegen, umbenennen, löschen)
- Outfit-Creator: Einzelteile zu benannten Outfits kombinieren, bearbeiten & löschen
- Datenschutz: eigene Ressourcen pro Benutzer, Impressum & Datenschutzerklärung
