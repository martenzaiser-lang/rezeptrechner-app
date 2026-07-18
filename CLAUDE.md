# CLAUDE.md — Rezeptrechner-Neuaufbau

Rezeptrechner der Landbäckerei Oetzmann: React-Client (Netlify),
Express-API (Render Free-Tier — schläft nach 15 min!), PostgreSQL bei
Neon (eigene DB `rezeptrechner` im bestehenden Neon-Projekt).
Sprache im Repo: Deutsch (Kommentare, Commits, UI).

**Umzug erfolgt (17.07.2026):** teigmaster.netlify.app liefert jetzt DIESE
neue App aus (Netlify-Site "teigmaster", bb11dabb…). Die alte App
(github.com/martenzaiser-lang/Rezeptrechner, Firebase/Firestore) bleibt nur
noch als Referenz für Vergleichstests — NIE ins alte Repo committen oder
Firebase ändern.

**DEPLOY — WICHTIG:** Die Netlify-Site ist NICHT mit diesem Repo verbunden.
`git push` deployt NICHTS! Client live bringen ausschließlich mit:
```bash
npm run deploy:client   # baut mit VITE_API_URL, deployt, verifiziert
```
(server/scripts/deploy-client.mjs — niemals `netlify deploy` von Hand ohne
VITE_API_URL im Build, sonst ist die API-Anbindung im Bundle kaputt.)
Der Server (Render) deployt automatisch bei Push auf main.

## Befehle (npm-Workspaces, EIN Lockfile im Root)

```bash
npm install                          # immer im Repo-ROOT
npm run dev:server                   # Express auf :4001 (braucht server/.env)
npm run dev:client                   # Vite auf :5174, /api-Proxy auf :4001
npm test                             # Server- + Client-Tests (Vitest)
npm run migrate --workspace server   # braucht DATABASE_URL
npm run seed --workspace server      # legt die 3 Benutzer an (SEED_*-Env-Vars)
```

## Architektur in 60 Sekunden

- `server/index.js` — Express, Helmet, CORS (kommaseparierte Origins),
  Rate-Limits. Env-Validierung: `server/config.js` (zod, Fail-Fast in Prod).
- `server/routes/` — auth (JWT, scrypt-Hashes wie Etiketten-App),
  recipes (JSONB pro Rezept, `version`-Zähler → 409, ETag → 304),
  settings, custom-ingredients, prices, changelog.
  Schreiben ist überall Admin-only (requireAdmin).
- `client/src/services/api.js` — der EINZIGE fetch-Pfad (Auth-Header,
  401-Redirect, 304-Handling). Keine direkten fetch() in Pages.
- `client/src/context/DataContext.jsx` — Polling (90 s + visibilitychange/
  online, ETag), localStorage-Cache (Offline!), 20 rotierende Backups.
- `client/src/lib/calc/` — Berechnungslogik als pure functions, 1:1 aus
  der alten index.html portiert. Fixture-Tests gegen die Alt-App —
  bei Änderungen IMMER `npm test --workspace client`.
- `client/src/data/` — statische Datenbanken (Nährwerte, Meistermarken,
  IREKS, Allergene, Synonyme, BÄKO-Preise), 1:1 aus der alten App.
- Design-System: `client/src/styles/theme.css` + `refresh-v3.css`
  UNVERÄNDERT aus der Etiketten-App übernommen — nicht editieren,
  eigene Styles in eigene Dateien.

## Stolperfallen

1. **A4-Druck-CSS**: niemals Hintergründe/Flächen im Print-CSS — der
   Druck-Spooler rastert sonst die ganze Seite (Erfahrung aus alter App).
2. **Rundung/Zahlformat**: de-DE mit Komma; Berechnungen müssen die
   Fixtures der Alt-App EXAKT treffen (nicht "ungefähr").
3. **Render Free**: Cold-Start ~50 s — Client muss immer zuerst aus dem
   localStorage-Cache rendern, Sync danach.
4. **Rollen**: Teigmacher sieht keine Kuchen (außer hardcodierte
   Mohnkuchen/Käsekuchen), Kuchenmacher NUR Kuchen und ohne
   Drucker/Bon/Sauerteig-UI.
5. **Web Bluetooth** (Bon-Druck) geht nur in Chrome/Edge über HTTPS oder
   localhost; in Playwright nicht testbar → escpos.js unit-testen.

## Konventionen

- Commits: Deutsch, Imperativ-Titel, Body erklärt das WARUM.
- Vor jedem Push: `npm test` + `npm run build` (client) grün.
- Keine neuen Dependencies ohne Not.
- Neue Env-Vars in `server/config.js` UND `server/.env.example` eintragen.
