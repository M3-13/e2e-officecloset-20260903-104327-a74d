VERDICT: CHANGES_REQUESTED

# Prüfbericht

## 1. DSGVO

**1.1 Transparenz / Verantwortlicher**
- Schweregrad: **hoch**
- Befund: `frontend/src/pages/DatenschutzPage.tsx` und `frontend/src/pages/ImpressumPage.tsx` sind vorhanden und verlinkt, enthalten aber ausschließlich Platzhalterdaten („Max Mustermann“, „Musterstraße 1“, `@example`). Eine Datenschutzerklärung / ein Impressum mit fiktivem Verantwortlichen ist rechtlich nicht wirksam.
- Abhilfe: Vor Veröffentlichung in beiden Dateien die echten Betreiberdaten einsetzen (Name, Anschrift, E-Mail, Telefon). Die Mustertext-Hinweise entfernen.

**1.2 Rechtsgrundlage und Datenarten**
- Schweregrad: **niedrig**
- Befund: E-Mail-Adresse, Passwort-Hash, Garderobendaten/Kategorien/Outfits sowie ggf. personenbezogene Bilder werden verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Das ist sachgerecht. Passwort wird als bcrypt-Hash gespeichert.
- Abhilfe: Keine Änderung nötig; in der Datenschutzerklärung ist bereits eine Beschreibung enthalten.

**1.3 Recht auf Datenübertragbarkeit (Art. 20 DSGVO)**
- Schweregrad: **mittel**
- Befund: Nutzer können Daten einsehen, bearbeiten und löschen, aber es gibt keinen Export-/Download-Endpunkt für eine strukturierte, maschinenlesbare Kopie der vom Nutzer bereitgestellten Daten.
- Abhilfe: Endpoint z. B. `GET /api/auth/me/export` ergänzen, der die eigenen Stammdaten, Kategorien, Kleidungsstücke und Outfits als JSON liefert. Alternativ Prozess dokumentieren.

**1.4 Datenminimierung / Aufbewahrung**
- Schweregrad: **niedrig**
- Befund: Löschung über `DELETE /api/auth/me` entfernt DB-Zeilen und Bilddateien. Es gibt keine automatische Löschung inaktiver Konten, aber die nutzerinitiierte Löschung ist ausreichend.
- Abhilfe: Keine dringende Änderung; optional Aufbewahrungsfrist für inaktive Konten dokumentieren.

**1.5 Protokollierung**
- Schweregrad: **niedrig**
- Befund: `backend/app/main.py` protokolliert nur `request.method` und `request.url.path`, keine E-Mail-Adressen oder Passwörter. AC-22 ist erfüllt.
- Abhilfe: Keine.

## 2. EU Cyber Resilience Act (CRA)

**2.1 Abhängigkeiten / SBOM**
- Schweregrad: **mittel**
- Befund: `backend/requirements.txt` und `frontend/package-lock.json` existieren, aber im geprüften Stand ist keine SBOM/gepinnte Abhängigkeitsliste als dokumentiertes Sicherheitsartefakt erkennbar.
- Abhilfe: Abhängigkeiten exakt pinnen (Versionen fixieren), eine SBOM (z. B. CycloneDX/SPDX) erzeugen und im Repository dokumentieren.

**2.2 Dokumentierte Sicherheitseigenschaften**
- Schweregrad: **mittel**
- Befund: Security-by-design-Maßnahmen sind im Code vorhanden (bcrypt, Rate-Limit, zufällige Dateinamen, Besitzerprüfung), aber eine explizite Sicherheits- bzw. Bedrohungsdokumentation fehlt.
- Abhilfe: `SECURITY.md` mit Sicherheitsarchitektur, Bedrohungsmodell, Umgang mit Schwachstellen und Kontakt für Sicherheitsmeldungen ergänzen.

**2.3 Update-/Patchfähigkeit**
- Schweregrad: **niedrig**
- Befund: Für die Web-App ist kein dokumentierter Update-/Deploymentprozess sichtbar.
- Abhilfe: Deployment-/Updateprozess in README oder `SECURITY.md` beschreiben.

**2.4 Validierung der Bildinhalte**
- Schweregrad: **mittel**
- Befund: `backend/app/storage.py` prüft nur den deklarierten Content-Type und die Größe, nicht den tatsächlichen Dateiinhalt (magic bytes). Ein manipuliertes Upload-File kann als Bild gespeichert werden.
- Abhilfe: In `save_image` mit einer Bildbibliothek (z. B. Pillow) prüfen, dass die Datei tatsächlich als JPEG/PNG/WebP dekodierbar ist, bevor sie gespeichert wird.

**2.5 Kategorie-Zuordnung bei Upload/Bearbeitung**
- Schweregrad: **mittel**
- Befund: `backend/app/routers/wardrobe.py` prüft nicht, ob die übermittelte `category_id` dem aktuellen Nutzer gehört. Dadurch können fremde IDs gespeichert werden (kein direkter Datenabfluss, aber Integritätsverstoß).
- Abhilfe: Vor dem Anlegen/Aktualisieren eines Kleidungsstücks prüfen, dass die Kategorie existiert und `owner_id == current_user.id`, sonst 404/422.

## 3. EU AI Act

**3.1 KI-Funktion**
- Schweregrad: **keine**
- Befund: Es ist kein KI-System erkennbar. Der EU AI Act ist nicht einschlägig.
- Abhilfe: Keine.

## 4. Pflichttexte & UI

**4.1 Impressum / Datenschutzerklärung**
- Schweregrad: **hoch**
- Befund: Seiten sind vorhanden und im Footer verlinkt (AC-19). Die Platzhalterdaten sind jedoch unzulässig (siehe 1.1).
- Abhilfe: Echte Betreiberdaten einsetzen, Mustertext-Hinweis entfernen.

**4.2 Cookies / Einwilligung**
- Schweregrad: **niedrig**
- Befund: Die App nutzt `localStorage` für Token und Benutzerdaten, keine Cookies und keine Drittanbieter-Ressourcen. Ein Consent-Banner ist nicht erforderlich, weil die Speicherung technisch notwendig ist.
- Abhilfe: Keine.

**4.3 AGB / Widerrufsbelehrung**
- Schweregrad: **niedrig**
- Befund: Keine Verkaufsfunktion; AGB/Widerrufsbelehrung sind nicht zwingend.
- Abhilfe: Keine.

## 5. Barrierefreiheit (WCAG/BITV/EAA)

**5.1 Fokusmanagement in Dialogen**
- Schweregrad: **mittel**
- Befund: Dialoge (`AccountPage.tsx`, `CategoriesPage.tsx`, `ItemDetailPage.tsx`, `OutfitsPage.tsx`) haben `role="dialog"`, aber kein `aria-modal`, keinen Fokusfang, keinen ESC-Handler und keinen Fokus beim Öffnen. Tastaturnutzer können hinter das Overlay tabben.
- Abhilfe: Dialog-Komponente mit `aria-modal="true"`, Fokusfang, initialem Fokus und `Escape`-Handler ergänzen.

**5.2 Farbkontrast**
- Schweregrad: **niedrig**
- Befund: `--color-muted: #9A8F9F` auf dunklem Hintergrund (`--color-bg: #0D0B0F`) kann für kleine Schriftgrößen (12/14 px) unterhalb der WCAG-Kontrastanforderung liegen.
- Abhilfe: Kontrast für `--color-muted` gegenüber dem Hintergrund auf mindestens 4,5:1 erhöhen.

**5.3 Formulare und Alternativtexte**
- Schweregrad: **niedrig**
- Befund: Labels sind verknüpft, Bilder haben Alt-Texte, Hauptsprache ist gesetzt (`lang="de"`). Weitgehend konform.
- Abhilfe: Keine.