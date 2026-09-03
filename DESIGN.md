# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkle Red-Carpet-Optik mit warmen Champagner-Gold-Akzenten, edler Serif-Typografie für Überschriften und ruhigen, eleganten Übergängen — glamourös, aber klar und zurückhaltend wie eine hochwertige Produkt-Oberfläche.

## Colors

- `--color-bg`: **#0D0B0F**
- `--color-surface`: **#17131A**
- `--color-surface_2`: **#201A25**
- `--color-fg`: **#F5F0E8**
- `--color-accent`: **#C9A24B**
- `--color-accent_hover`: **#D9B45E**
- `--color-accent_soft`: **#3A2F1D**
- `--color-border`: **#2E2633**
- `--color-muted`: **#9A8F9F**
- `--color-danger`: **#E0655B**
- `--color-success`: **#7FB77E**
- `--color-on_accent`: **#1A140C**

## Typography

- `heading_family`: Georgia, 'Times New Roman', serif
- `body_family`: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
- `font_family`: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: 12px / 14px / 16px / 20px / 28px / 36px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px
- `--space-7`: 64px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

Primary: padding 12px 24px, radius md, bg=accent #C9A24B, color=on_accent #1A140C, font-weight 600, min-height 44px (Touch), transition 160ms ease; hover bg=accent_hover #D9B45E; active translateY(1px) + bg etwas dunkler #B58F3E; disabled opacity 0.5, pointer-events none. Secondary: bg transparent/surface, border 1px border #2E2633, color fg; hover border accent + color accent. Danger: bg danger #E0655B, color #1A0F0D. Optional .btn-icon quadratisch 44x44, radius md.

### Card

bg=surface #17131A, border 1px border #2E2633, radius lg 16px, padding 16px (mobil) / 24px (desktop), box-shadow 0 12px 32px rgba(0,0,0,0.25); hover bei klickbaren Karten: border accent, translateY(-2px), transition 200ms ease.

### Input

bg=surface_2 #201A25, border 1px border, radius md 8px, padding 12px 16px, color fg, min-height 44px; placeholder color muted; focus border accent #C9A24B + box-shadow 0 0 0 3px rgba(201,162,75,0.18); invalid/error border danger.

### Label

font-size 14px, font-weight 600, color fg, margin-bottom 8px; optional kleines Gold-Detail (2px Strich) oberhalb bei Formular-Sektionen.

### Modal

Overlay rgba(13,11,15,0.72) + backdrop-filter blur(4px); Panel bg=surface #17131A, border 1px border, radius lg 16px, padding 24px, max-width 520px, box-shadow 0 24px 64px rgba(0,0,0,0.5); Einblendung opacity 0→1 + scale 0.96→1, 180ms ease.

### Nav

position sticky top 0, height 64px, bg rgba(13,11,15,0.85) + backdrop-filter blur(8px), border-bottom 1px border; links 14px, padding 8px 12px, color muted, hover color fg; aktiver Link color accent + 1px goldener Unterstrich.

### Badge/Chip (Kategorie)

radius pill, padding 6px 14px, bg=surface_2, border 1px border, color muted, font-size 12px, min-height 32px; aktiver/gewählter Zustand: bg=accent_soft #3A2F1D, border accent, color accent.

### EmptyState

zentriert, padding 48px 24px; Icon in Kreis 64px, bg surface_2, border 1px border, Farbe muted; Titel 20px Serif fg; Beschreibung 14px muted, max-width 420px; darunter primärer Button.

### Toast/Feedback

position fixed bottom 24px rechts, bg surface_2, border 1px, radius md, padding 12px 16px, font-size 14px; success: border success, Text fg mit success-Icon; error: border danger; auto-hide 4s, transition opacity 200ms.

### GalerieGrid

display grid, grid-template-columns repeat(auto-fill, minmax(180px, 1fr)), gap 16px; Kartenbilder object-fit cover, aspect-ratio 3/4, radius md, bg surface_2 mit feiner border.

## Layout Principles

- Container max-width 1200px, horizontal padding 16px (mobil) / 24px (ab 768px), zentriert.
- Breakpoints: <640px mobil (einspaltig), 640–1024px Tablet, >1024px Desktop.
- Vertikaler Rhythmus: Sektionsabstand 48px, innerhalb von Karten 16px, Formularfelder 16px Abstand.
- Formulare (Login/Registrierung) als zentrierte Karte max-width 440px mit Branding-Detail darüber.
- Galerie nutzt CSS-Grid mit auto-fill und minmax(180px, 1fr); Outfit-Karten minmax(260px, 1fr).
- Farbhierarchie: dunkler Hintergrund -> Flächen surface -> Inhalte fg; Gold ausschließlich für primäre Aktionen, aktive Zustände und Akzentlinien.
- Zugänglichkeit: Kontrast fg/bg ≥ 12:1, muted/bg ≥ 4.5:1, accent nur dekorativ oder mit on_accent-Text; Fokus-Zustände nie nur per Farbe.
- Übergänge: max 160–200ms, ease; nur opacity, transform, border-color, background-color animieren.
