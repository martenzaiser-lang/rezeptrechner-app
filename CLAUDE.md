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

**DEPLOY:** Seit 18.07.2026 ist die Netlify-Site mit DIESEM Repo verbunden —
Push auf main deployt Client (Netlify) UND Server (Render) automatisch.
Nach dem Push kurz prüfen, dass der Netlify-Build durchläuft und das neue
Bundle live ist (Hash in index.html vergleichen). VITE_API_URL kommt beim
Netlify-Build aus den Site-Env-Vars im Dashboard — fehlt sie, hat das
Bundle keine API-Anbindung! Notfall-Weg (Netlify-Build klemmt):
```bash
npm run deploy:client   # baut lokal mit VITE_API_URL, deployt, verifiziert
```

## Befehle (npm-Workspaces, EIN Lockfile im Root)

```bash
npm ci                               # Node 24, immer im Repo-ROOT
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
  settings, custom-ingredients, prices, changelog, backup.
  Schreiben ist überall Admin-only (requireAdmin).
- `client/src/services/api.js` — der EINZIGE fetch-Pfad (Auth-Header,
  401-Redirect, 304-Handling). Keine direkten fetch() in Pages.
- `client/src/context/DataContext.jsx` — Polling (90 s + visibilitychange/
  online, ETag), localStorage-Cache (Offline!), 20 rotierende Backups.
- `client/src/lib/calc/` — gemeinsame Fachberechnungen für Client und API.
  Fachtests prüfen Gesamtmehl, Vorstufen, Prozentrezepte und Produktvarianten —
  bei Änderungen IMMER `npm test --workspace client`.
  NEU (Juli 2026): `verkaufsZutaten.js` — Zutatenverzeichnis für lose Ware
  (LMIV-API → Personalplaner-Produkt-Auskunft): Backmittel werden in ihre
  Unterzutaten in ihrer Hersteller-Reihenfolge dargestellt. Ohne bekannte
  Mengenanteile keine globale Umsortierung der Unterzutaten.
- `client/src/data/` — Nährwerte mit Quellenbelegen (Hersteller-PDFs,
  BLS 4.0), Allergene, ausdrücklich zugeordnete Synonyme und BÄKO-Preise.
- `shared/` — Validierung und vollständiges Sicherungsformat (vier Datengruppen).
- Render baut vom Repository-Root, weil die API auch `client/src` und
  `shared` importiert. Installation: `npm ci --workspace server --omit=dev`.
  Start: `npm run migrate --workspace server && npm run start --workspace server`.
- Design-System: `client/src/styles/theme.css` + `refresh-v3.css`
  UNVERÄNDERT aus der Etiketten-App übernommen — nicht editieren,
  eigene Styles in eigene Dateien.

## Stolperfallen

1. **A4-Druck-CSS**: niemals Hintergründe/Flächen im Print-CSS — der
   Druck-Spooler rastert sonst die ganze Seite (Erfahrung aus alter App).
2. **Rundung/Zahlformat**: de-DE mit Komma; erst die Anzeige runden.
   Fachlich korrigierte Ergebnisse haben Vorrang vor alten Vergleichswerten.
3. **Render Free**: Cold-Start ~50 s — Client muss immer zuerst aus dem
   localStorage-Cache rendern, Sync danach.
4. **Rollen**: Teigmacher sieht keine Kuchen (außer hardcodierte
   Mohnkuchen/Käsekuchen), Kuchenmacher NUR Kuchen und ohne
   Drucker/Bon/Sauerteig-UI.
5. **Web Bluetooth** (Bon-Druck) geht nur in Chrome/Edge über HTTPS oder
   localhost; in Playwright nicht testbar → escpos.js unit-testen.
6. **Fachregeln**: Alle Bäckerprozente beziehen sich auf Gesamtmehl inkl.
   Vorstufen. Saaten und Altbrot zählen nicht als Mehl. Paniermehl (auch
   Semmelbrösel/Semmelmehl) zählt laut Marten vom 15.10.2026 exakt wie Mehl,
   einschließlich seines Anteils in der Brotmischung. Massen bekommen keine TA.
   Fehlende Vorstufenanteile niemals pauschal mit TA 200 ersetzen. Für den
   betrieblichen Roggen-/Weizensauer hat Marten am 14.10.2026 bestätigt:
   1 kg Mehl + 1 kg Wasser + 20 g Salz = 2,02 kg, TA 200. Daher je
   1/2,02 Mehl/Wasser, NICHT je 50 %.
   Gekochte Roggenkörner (auch Katen-/Mehrkornbrot): 1 kg Körner + ca. 2,5 l
   Wasser. Rechnerische 3,5 kg sind eine Schätzung, keine gemessene Ausbeute.
   Gemeinsame Grundlage für TA/Nährwerte/Preise: `data/betrieblicheVorstufen.js`.
   `ta_pro_kg` erfasst Vorstufen auch bei Prozentmengen. Eigene Mischungen
   werden über `rezeptZutaten.js` aus aktuellen Quellrezepten abgeleitet.
   Unbekannte Trägermehle nur nach ausdrücklicher fachlicher Festlegung als
   Näherung kennzeichnen; größere Fertigmischungen nicht pauschal als Mehl zählen.
   Kochstück nach dem
   Abkühlen auf Sollgewicht ergänzen; Ausgleichswasser nicht doppelt zählen.
7. **Nährwerte**: Bezug ist 100 g des gesamten Produkts inkl. Wasser. Nur mit
   bestätigtem Backverlust als Endprodukt deklarieren: `gemessen` oder ausdrücklich
   `geschaetzt`; Altwerte ohne Status bleiben unbestätigt. Bezug ist die gesamte
   Rezeptur einschließlich späterer Füllungen/Glasuren. Ballaststoffe sind optional
   und bleiben bei fehlender Quelle leer; alle Pflichtfelder müssen bekannt sein.
   Fehlende Hersteller-/Rohstoffwerte bleiben unbekannt, nicht automatisch null.
   Eigene Zutaten haben Vorrang; Referenzübernahme nur als prüfbarer Editorentwurf.
   `vollstaendig` in produktNaehrwerte bewertet die Zahlen; erst
   `deklarationVollstaendig` gibt die Ausgabe frei (zusätzlich geprüfte Allergene
   und Zusammensetzungen). Druck, Kopieren, Backen-Anzeige und LMIV-API beachten
   diese zusätzlichen Lücken. Neue Artikel brauchen eine Zutatenliste oder die
   ausdrückliche Zuordnung als reiner Rohstoff; eigene Mischungen vererben Lücken.
   Für beauftragte Datenabgleiche: `server/scripts/apply-quality-plan.mjs` prüft
   einen externen JSON-Plan gegen den aktuellen Datenstand. Ohne `--apply` schreibt
   es nichts. Mit `--apply`: Dateisicherung, Versionsvergleich und eine Transaktion.
   Bestätigungen vom 14.10.2026: „Backerbse“ ist getoasteter gelber Erbsenschrot
   (Backstars/Kastanienerbsen), keine Suppeneinlage. Oliven: ADRIA grün ohne Stein
   28/32, GTIN 4003735721635. Vanillezucker wird nicht verwendet: tatsächlich
   Combani (80 g Amerikanerschnitte, 20 g Spanische je Grundansatz).
   Sandtortenmasse: je 5 g Combani/Sizilia pro kg Mehl; Quarkstriezel: je 5 g
   pro kg Quark plus 1 g Salz/kg Quark. Vorhandene Backverluste dürfen laut
   Marten als Schätzungen verwendet werden; fehlende Werte bleiben offen.
   Teilrezepte/Füllungen kennzeichnen ihren tatsächlichen Gewichtsbezug.
8. **Produktionsdaten**: Prüfberichte und Neon-Sicherungen liegen außerhalb
   dieses Repositories. Browserprüfungen laufen mit isolierter Testdatenbank.
9. **Sortimentskalkulation**: Admin → Sortiment kalkulieren. Jede aktive Variante
   erhält Rohstoffkosten und einen gerundeten Brutto-Preisvorschlag. Bei Kuchen
   zuerst Stücke pro Blech festlegen. Der Entwurf (`settings.sortimentskalkulation`)
   speichert bisherige/neue Preise und Zielquoten; CSV dient der Preisrunde, es gibt
   keine automatische Kassenübertragung. Fehlende Preise verhindern Vorschläge;
   BÄKO-Referenzen bleiben auch in verschachtelten eigenen Mischungen sichtbar.
   `rezeptPreise` berechnet eigene Mischungen aus aktuellen Rohstoffpreisen.
10. **UI**: Politur ausschließlich in `polish.css`/`sortiment.css`, bestehende
    Farbpalette behalten. Dialoge haben scrollbaren Inhalt und erreichbare Aktionen.
    Bewegungsreduktion des Betriebssystems beachten; Druck bleibt schwarz/weiß.

## Konventionen

- Commits: Deutsch, Imperativ-Titel, Body erklärt das WARUM.
- Vor jedem Push: `npm test` + `npm run build` (client) grün.
- Keine neuen Dependencies ohne Not.
- Neue Env-Vars in `server/config.js` UND `server/.env.example` eintragen.
