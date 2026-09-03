VERDICT: CHANGES_REQUESTED

## Sicherheitsprüfung des Gesamtprodukts „Glamouröser Kleiderschrank-Manager“

Ich habe den vorliegenden Stand (Backend/FastAPI, Frontend/React/Vite, SQLite, JWT, Upload-Verarbeitung) analysiert. Die Scanner (bandit, semgrep, pip-audit/npm audit) sind als `[skipped]` markiert und konnten nicht ausgeführt werden. Dieser Umstand wird als Lücke dokumentiert, aus ihm allein lässt sich jedoch kein Befund ableiten.

### Zusammenfassende Einschätzung

Die Kernarchitektur ist solide: SQLAlchemy verhindert SQL-Injection, Ownership-Prüfungen sind konsistent auf 404 gestellt, CORS ist auf eine konkrete Origin beschränkt, Passwörter werden mit bcrypt gehasht, und der Upload-Pfad wird mit zufälligen Dateinamen und einer Path-Traversal-Sperre versehen. Es wurden **keine kritischen oder hohen Schwachstellen** gefunden.

Es bestehen jedoch mehrere mittlere und niedrige Befunde, die vor einer Auslieferung behoben bzw. bewusst abgewogen werden sollten. Insbesondere verletzt die derzeitige Logout-Implementierung eine explizite Sicherheitsanforderung (AC-11), und die Datei-Upload-Validierung verlässt sich ausschließlich auf den clientseitig deklarierten Content-Type.

---

## Befunde im Detail

### 1. Logout invalidiert serverseitig kein JWT
- **Schweregrad:** mittel
- **Betroffene Stelle:** `backend/app/routers/auth.py` – `POST /api/auth/logout` (`logout`-Funktion)
- **Beschreibung:**  
  Der Endpoint ist zwar authentifiziert, gibt aber lediglich `204` zurück und führt keine serverseitige Invalidierung des vorgelegten Bearer-Tokens durch. Da JWTs zustandslos sind, bleibt ein einmal ausgestelltes Token bis zum Ablauf der `exp`-Zeit gültig. Ein vor dem Logout gestohlenes oder kopiertes Token funktioniert nach dem Logout weiterhin für alle geschützten Endpunkte. Dies verletzt AC-11 („Nach Logout … sind geschützte Ansichten und Endpunkte nicht mehr erreichbar“).
- **Konkrete Lösung:**  
  Implementierung einer Token-Blacklist (z. B. serverseitige Liste von `jti`-Claims mit Ablaufzeit, in Redis oder der Datenbank) und Prüfung in `get_current_user`. Alternativ Erfüllung der Anforderung durch drastische Verkürzung der Lebensdauer und Einführung von Refresh-Tokens, wobei das Logout-Revoke-Problem sauber gelöst werden muss. Der Frontend-Token wird bereits lokal gelöscht; die Serveranforderung verlangt jedoch die tatsächliche Unbrauchbarkeit des Tokens.

### 2. Bild-Upload validiert nur den deklarierten Content-Type, nicht den Dateiinhalt
- **Schweregrad:** mittel
- **Betroffene Stelle:** `backend/app/storage.py` – `save_image`
- **Beschreibung:**  
  `file.content_type` ist ein clientseitig frei wählbarer HTTP-Header. Der Code akzeptiert ihn als alleinige Grundlage für die Bestimmung der Dateiendung (`_ALLOWED_CONTENT_TYPES`). Es findet keine Überprüfung der tatsächlichen Magischen Bytes (Dateisignatur) statt. Dadurch kann ein Angreifer beliebige Inhalte (z. B. ausführbare Skripte, HTML, beliebige Binärdaten) als „Bild“ hochladen. Die Datei wird unter einer Bild-Endung gespeichert und später mit `FileResponse` und einem Bild-`Content-Type` ausgeliefert. Auch wenn aktuelle Browser Bild-MIME-Typen in der Regel nicht als aktiven Inhalt interpretieren, ist diese Schwäche eine Verletzung von AC-04 („echtes Bild annehmen, ungültige Dateien abweisen“) und öffnet Tür für Social-Engineering/Integritätsprobleme.
- **Konkrete Lösung:**  
  Zusätzlich zur Content-Type-Prüfung die ersten Bytes der hochgeladenen Datei lesen und gegen die bekannten Signaturen für JPEG, PNG und WebP prüfen. Beispiele: JPEG beginnt mit `FF D8 FF`, PNG mit `89 50 4E 47 0D 0A 1A 0A`, WebP mit `RIFF….WEBP`. Besser: Verwendung einer Bildverarbeitungsbibliothek (z. B. Pillow) mit `Image.verify()`.

### 3. Content-Length-Prüfung kann durch fehlenden Header umgangen werden
- **Schweregrad:** mittel (DoS-Risiko)
- **Betroffene Stelle:** `backend/app/routers/wardrobe.py` – `_check_content_length`
- **Beschreibung:**  
  Die Dependency greift nur, wenn der Header `content-length` vorhanden ist. HTTP/1.1 erlaubt auch `Transfer-Encoding: chunked` oder – je nach Client – das Weglassen des Headers. In diesem Fall wird der Request-Body vollständig von FastAPI geparst und erst in `save_image` nach dem `file.file.read()` geprüft. Damit wird AC-15 („Größenlimit … vor dem Einlesen des Request-Bodys“) nicht durchgängig eingehalten. Ein Angreifer kann mehrere große Uploads ohne Content-Length senden und so Speicher/CPU des Servers belasten.
- **Konkrete Lösung:**  
  Für Upload-Routen einen `Content-Length`-Header erzwingen: Fehlt er, mit `411 Length Required` ablehnen. Alternativ eine Streaming-Lösung, die den Body blockweise liest und bei Überschreitung sofort abbricht, ohne den gesamten Body zu puffern.

### 4. Passwort-Längenbegrenzung zählt Zeichen statt Bytes
- **Schweregrad:** mittel
- **Betroffene Stelle:** `backend/app/routers/auth.py` – `_validate_credentials`, `_MAX_PASSWORD_LENGTH = 72`
- **Beschreibung:**  
  bcrypt verarbeitet nur die ersten 72 **Bytes** des Passworts. Der Code prüft jedoch `len(password)` (Zeichen). Ein Passwort, das aus Unicode-Zeichen besteht (z. B. 72 Umlaute → 144 Bytes), passiert die Validierung. Je nach verwendeter `bcrypt`-Version führt dies entweder zu einer stillen Kürzung (zwei unterschiedliche Passwörter erzeugen denselben Hash) oder zu einer `ValueError`-Exception, die über den generischen Exception-Handler als `500 Internal Server Error` endet. Beides ist unerwünscht.
- **Konkrete Lösung:**  
  Die Byte-Länge prüfen: `if len(password.encode("utf-8")) > 72: raise HTTPException(422, …)`. Zusätzlich die `bcrypt.hashpw`-Exception abfangen, um einen sauberen 422er statt 500er zu liefern.

### 5. Fehlende Security-Header
- **Schweregrad:** niedrig (Härtung)
- **Betroffene Stelle:** `backend/app/main.py` – FastAPI-App-Konfiguration
- **Beschreibung:**  
  Es werden keine `X-Content-Type-Options: nosniff`, keine `Content-Security-Policy` (CSP) und keine `X-Frame-Options` / `frame-ancestors` gesetzt. Insbesondere beim Ausliefern der hochgeladenen Bilder fehlt `nosniff`, was das MIME-Sniffing-Risiko zwar gering, aber vorhanden hält. Eine restriktive CSP würde das Risiko von XSS weiter reduzieren.
- **Konkrete Lösung:**  
  Middleware hinzufügen, die `X-Content-Type-Options: nosniff` setzt, eine CSP definiert, die nur die eigene App (`self`), die konfigurierte API-Basis und Blob-URLs erlaubt, sowie `frame-ancestors 'none'` setzt. Wichtig: Die CSP muss die legitimen Ressourcen der Anwendung (lokale Skripte, Styles, API-Aufrufe, Blob-Bilder) weiterhin erlauben.

### 6. Breit gefasste CORS-Header
- **Schweregrad:** niedrig (Härtung)
- **Betroffene Stelle:** `backend/app/main.py` – `CORSMiddleware`
- **Beschreibung:**  
  `allow_methods=["*"]` und `allow_headers=["*"]` sind sehr permissiv. Da die Origin strikt auf `settings.frontend_origin` beschränkt ist, ist das Risiko begrenzt, aber eine Einschränkung auf die tatsächlich benötigten Methoden (`GET`, `POST`, `PATCH`, `DELETE`) und Header (`Authorization`, `Content-Type`) wäre sauberer.
- **Konkrete Lösung:**  
  `allow_methods=["GET", "POST", "PATCH", "DELETE"]` und `allow_headers=["Authorization", "Content-Type"]` setzen.

### 7. Fehlende Längenbegrenzungen auf mehreren Eingabefeldern
- **Schweregrad:** niedrig (DoS/Qualität)
- **Betroffene Stellen:**  
  `backend/app/schemas.py` – `OutfitCreate`, `OutfitUpdate`, `UserCreate`, `UserLogin`; `backend/app/routers/wardrobe.py` – `list_items` (`q`-Parameter); `backend/app/routers/outfits.py` – `_resolve_owned_items` (`item_ids`)
- **Beschreibung:**  
  `OutfitCreate.name` / `OutfitUpdate.name` haben nur `min_length=1`, keine `max_length`. `UserCreate.email` / `UserLogin.email` haben keine Maximalgrenze. Der Suchparameter `q` kann beliebig lang sein, und `item_ids` kann eine sehr große Liste übergeben. Dies ermöglicht übermäßig große Payloads und unnötige Last auf Datenbank und Anwendung.
- **Konkrete Lösung:**  
  Pydantic-Constraints ergänzen: z. B. `name: str = Field(min_length=1, max_length=200)`; `email: EmailStr` (nach Validierung) mit `max_length=254`; `item_ids: list[int] = Field(max_length=100)`; im Backend `q: str | None = Query(default=None, max_length=200)` setzen.

### 8. JWT im localStorage
- **Schweregrad:** niedrig (Härtung)
- **Betroffene Stelle:** `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`
- **Beschreibung:**  
  Der Bearer-Token wird im `localStorage` gespeichert. Sollte eine XSS-Lücke auftreten, kann der Token direkt ausgelesen werden. Derzeit wurde kein XSS gefunden, daher nur eine Empfehlung.
- **Konkrete Lösung:**  
  Auf ein HttpOnly- und Secure-Cookie mit CSRF-Schutz umstellen oder – falls an localStorage festgehalten wird – zusätzliche clientseitige Härtungen (z. B. CSP) implementieren und dokumentieren.

### 9. Account-Löschung entfernt Bilddateien nur best effort
- **Schweregrad:** niedrig
- **Betroffene Stelle:** `backend/app/routers/account.py` – `delete_me`, `backend/app/storage.py` – `delete_image`
- **Beschreibung:**  
  `delete_image` fängt `OSError` und kehrt still zurück. Bei einem Dateisystemfehler kann eine Bilddatei nach dem Löschen des Accounts auf der Festplatte verbleiben. Die DB-Daten werden korrekt gelöscht, aber AC-21 verlangt die vollständige Löschung aller zugehörigen Daten.
- **Konkrete Lösung:**  
  Fehler beim Löschen protokollieren und als asynchronen Nachverarbeitungsschritt wiederholen; oder die Dateilöschung transaktional vorbereiten (z. B. Dateien in einen Papierkorb verschieben, der bei erfolgreichem DB-Commit endgültig geleert wird).

---

## Hinweis zu nicht verfügbaren Scanner-Ergebnissen

Die Abschnitte `bandit`, `semgrep` und `pip-audit`/`npm audit` sind im bereitgestellten Scanner-Output als `[skipped]` markiert. Dadurch konnten keine automatisierten Aussagen über bekannte Schwachstellen in den eingebundenen Python- und npm-Abhängigkeiten getroffen werden. Dieser Umstand stellt selbst keinen Befund dar, muss aber vor einem Release durch einen tatsächlichen Durchlauf der Dependency-Scanner geschlossen werden. Insbesondere sind die Versionen aus `backend/requirements.txt` und `frontend/package.json` nicht sichtbar; ich empfehle, `pip-audit` und `npm audit` in der CI verpflichtend auszuführen.