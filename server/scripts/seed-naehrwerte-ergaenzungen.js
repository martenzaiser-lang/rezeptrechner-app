// Seed: Nährwert-/Allergen-Ergänzungen für Zutaten OHNE Daten (Audit
// client/test/audit-naehrwerte.mjs, Stand 2026-07). Schreibt in die
// Tabelle custom_ingredients (Live-DB!). Idempotent:
//   - INSERT ... ON CONFLICT (name) DO UPDATE, ABER nur wenn der
//     bestehende Eintrag selbst vom Seed stammt (data ? 'quelle').
//     Von Marten über das Zutat-Daten-Modal gepflegte Einträge haben
//     kein 'quelle'-Feld und werden NIE überschrieben.
//
// Datenformat pro Eintrag (beide Lookup-Formate der App, wie
// ZutatDatenModal.jsx speichert):
//   { kcal, eiweiss, fett, gfs, kh, zucker, ballaststoffe, salz,
//     protein (=eiweiss), carbs (=kh), fat (=fett),
//     a / allergene (EU-Codes, nur wenn gesichert!), quelle }
//
// WICHTIG (LMIV, lose Ware): Wo Allergene NICHT sicher bestimmbar sind
// (Gewürzmischungen: Senf/Sellerie; eingelegte Ware: Sulfite; Schoko:
// Soja- vs. Sonnenblumenlecithin; Schinken: Herstellerabhängig), werden
// die Felder a/allergene BEWUSST WEGGELASSEN — ein leeres Array [] würde
// in getRezeptAllergene() "allergenfrei" zusichern und den Pattern-
// Fallback der App abschalten. Diese Fälle stehen im Übergabebericht
// als "von Marten zu prüfen".
//
// Aufruf:  cd server && node scripts/seed-naehrwerte-ergaenzungen.js
// Die Daten werden zusätzlich exportiert, damit das Audit
// (client/test/audit-naehrwerte.mjs) sie als Spiegel der DB einbeziehen
// kann, ohne eine DB-Verbindung zu brauchen.

import { pathToFileURL } from 'node:url';

// Helper: baut den JSONB-Datensatz inkl. der Pflicht-Duplikate
// protein/carbs/fat. allergene === null → Felder weglassen (unklar).
function nw(kcal, eiweiss, fett, gfs, kh, zucker, ballaststoffe, salz, allergene, quelle) {
  const d = {
    kcal, eiweiss, fett, gfs, kh, zucker, ballaststoffe, salz,
    protein: eiweiss, carbs: kh, fat: fett,
    quelle,
  };
  if (allergene !== null) {
    d.a = allergene;
    d.allergene = allergene;
  }
  return d;
}

export const NAEHRWERT_ERGAENZUNGEN = {
  // ── Aus App-internen Basisdaten übernommen (Konsistenz mit ZUTAT_NAEHRWERTE) ──
  'O-Saft': nw(45, 0.7, 0.2, 0, 10.0, 8.4, 0.2, 0.01, [], '= Orangensaft (app-interne ZUTAT_NAEHRWERTE)'),
  'Möhren': nw(41, 0.9, 0.2, 0, 8.0, 4.7, 2.8, 0.07, [], '= Karotten (app-interne ZUTAT_NAEHRWERTE "karottenstifte")'),
  'Rote-Bete': nw(43, 1.6, 0.2, 0, 8.0, 7.0, 2.8, 0.08, [], '= app-interne ZUTAT_NAEHRWERTE "rote bete" (Bindestrich-Schreibweise)'),
  'Leinsaat': nw(488, 22.0, 36.0, 3.2, 0, 0, 35.0, 0.05, [], '= app-interne ZUTAT_NAEHRWERTE "leinsamen"'),
  'Leinsaat (eingeweicht)': nw(488, 22.0, 36.0, 3.2, 0, 0, 35.0, 0.05, [], '= Leinsamen trocken (app-intern); bestätigt (Marten 22.07.2026): Rezeptmenge = Trockensaat, Quellwasser separat'),
  'Kleber': nw(370, 75.0, 1.8, 0.3, 14.0, 0.5, 0.6, 0.02, ['Aa'], '= Weizenkleber/Gluten (app-interne ZUTAT_NAEHRWERTE "weizengluten")'),
  'Eiklar': nw(47, 11.0, 0.1, 0, 0.7, 0.7, 0, 0.4, ['C'], '= app-interne ZUTAT_NAEHRWERTE "eiweiß"'),

  // ── Getreide, Stärken, Saaten, Hülsenfrüchte (Web/BLS) ──
  'Grieß': nw(326, 9.6, 0.8, 0.2, 68.9, 0.7, 7.1, 0.01, ['Aa'], 'naehrwertrechner.de (BLS); bestätigt (Marten 22.07.2026): Grieß = Hartweizengrieß (nährwertgleich mit Weizengrieß, s. Eintrag Hartweizengrieß)'),
  'Weizengrieß': nw(326, 9.6, 0.8, 0.2, 68.9, 0.7, 7.1, 0.01, ['Aa'], 'naehrwertrechner.de (BLS) Weizen Grieß'),
  'Hartweizengrieß': nw(326, 9.6, 0.8, 0.2, 68.9, 0.7, 7.1, 0.01, ['Aa'], 'naehrwertrechner.de (BLS) Weizengrieß; Hartweizen nährwertgleich'),
  'Hartweizengreiß': nw(326, 9.6, 0.8, 0.2, 68.9, 0.7, 7.1, 0.01, ['Aa'], 'wie Hartweizengrieß (Tippfehler-Schreibweise im Rezept Sauerteigbrötchen)'),
  'Weizenstärke': nw(353, 0.4, 0.1, 0, 86.0, 0.3, 1.0, 0.01, ['Aa'], 'wikifit/bmi-rechner Weizenstärke; Weizenstärke ist LMIV-deklarationspflichtig (Aa)'),
  'Stärke': nw(353, 0.4, 0.1, 0, 86.0, 0.3, 1.0, 0.01, ['Aa'], 'wie Weizenstärke (fddb 349-353); bestätigt (Marten 22.07.2026): Stärke = Weizenstärke (Aa)'),
  'Hirse': nw(360, 10.5, 3.9, 0.6, 71.0, 1.0, 3.8, 0.01, [], 'naehrwertrechner.de (BLS) Hirse roh, glutenfrei'),
  'Linsen': nw(284, 23.5, 1.6, 0.2, 42.0, 1.5, 17.0, 0.01, [], 'BLS/naehrwertrechner Linsen reif getrocknet; bestätigt (Marten 22.07.2026): trockene Ware'),
  'Süßlupine': nw(362, 43.0, 9.0, 1.9, 13.0, 4.5, 27.0, 0.09, ['M'], 'naehrwertrechner.de (BLS) Lupinenschrot; Zucker geschätzt aus typ. Etiketten; ALLERGEN LUPINE (M)!'),

  // ── Milchprodukte, Käse, Fleisch (Web) ──
  'Fetakäse': nw(250, 16.5, 20.0, 13.5, 1.0, 1.0, 0, 2.8, ['G'], 'Mittel aus fddb/openfoodfacts/naehrwertrechner Feta 45% i.Tr. (214-276 kcal je Marke)'),
  'Frischkäse': nw(255, 4.8, 25.0, 16.5, 3.0, 3.0, 0, 0.75, ['G'], 'fddb K-Classic/TiP Frischkäse Doppelrahmstufe (252-264 kcal)'),
  'Gouda': nw(364, 22.0, 31.0, 21.2, 0, 0, 0, 2.0, ['G'], 'naehrwertrechner.de (BLS) Gouda 48% F.i.Tr.'),
  // 'Käsemix' = 1:1-Mischung Gouda + Emmentaler (laut Marten 2026-07-17).
  // Mittel aus Gouda (s.o.) und Emmentaler 45% F.i.Tr. (BLS: 382 kcal,
  // 28.7 EW, 29.7 F, 17.7 GFS, 0.6 Salz).
  'Käsemix': nw(373, 25.4, 30.4, 19.5, 0, 0, 0, 1.3, ['G'], '1:1 Gouda + Emmentaler (laut Marten); Werte gemittelt aus naehrwertrechner.de (BLS)'),
  'Schmand': nw(240, 2.9, 24.0, 15.5, 3.4, 3.4, 0, 0.1, ['G'], 'fddb/wikifit Schmand 24% Fett (238-244 kcal)'),
  'Skyr': nw(63, 11.0, 0.2, 0.1, 4.0, 4.0, 0, 0.13, ['G'], 'fddb Arla/Milram Skyr natur (63-66 kcal je Marke)'),
  // Schinken = Abraham Würfelschinken Premium geräuchert (Marten
  // 22.07.2026). zutaten_lmiv fürs Kenntlichmachungs-Scanning:
  // Konservierungsstoff (Nitritpökelsalz) + Antioxidationsmittel sind
  // bei loser Ware kenntlichmachungspflichtig!
  'Schinken': {
    ...nw(114, 23.0, 2.0, 0.7, 1.0, 1.0, 0, 5.0, [], 'Abraham Würfelschinken Premium geräuchert (Herstellerangaben); bestätigt (Marten 22.07.2026); keine Allergen-Zutat'),
    zutaten_lmiv: 'Schweinefleisch; Speisesalz (teilweise jodiert); Dextrose; Gewürze; Gewürzextrakte; Antioxidationsmittel: Natriumascorbat; Säuerungsmittel: Citronensäure; Konservierungsstoff: Natriumnitrit, Kaliumnitrat; Buchenholzrauch.',
  },

  // ── Obst, Gemüse (Web) ──
  'Himbeere': nw(34, 1.3, 0.3, 0, 4.8, 4.8, 6.7, 0.01, [], 'naehrwertrechner.de (BLS)/Plantura Himbeere frisch/TK'),
  'Sauerkirschen': nw(53, 0.9, 0.5, 0.1, 9.9, 9.6, 1.1, 0.01, [], 'naehrwertrechner.de (BLS) Sauerkirsche; bestätigt (Marten 22.07.2026): ungezuckerte Ware (Dunst/TK)'),
  'Stachelbeeren': nw(55, 0.5, 0.2, 0.1, 10.7, 8.0, 2.9, 0, [], 'Steinhaus "Stachelbeeren, sehr leicht gezuckert" Art. 2.019.0 (Herstellerangaben steinhaus-fruchtkonserven.de); von Marten 22.07.2026: Steinhaus, leicht gezuckert — GFS <0,1 als 0,1 Obergrenze'),
  'Dunstäpfel': nw(54, 0.3, 0.1, 0, 11.4, 10.3, 2.0, 0.01, [], 'BLS Apfel; Dunstobst = ohne Zuckerzusatz gegart, Nährwerte ≈ roh'),
  'Apfelsaft': nw(46, 0.1, 0.1, 0, 11.1, 10.5, 0.1, 0.01, [], 'bmi-rechner.net/kalorientabelle.net Apfelsaft'),
  'Zitrone': nw(39, 0.7, 0.6, 0.1, 3.2, 2.5, 1.3, 0.01, [], 'naehrwertrechner.de (BLS) Zitrone frisch'),
  'Zitronensaft': nw(25, 0.4, 0.2, 0, 2.4, 2.4, 0.1, 0.01, [], 'fddb/nutriscan Zitronensaft pur'),
  'Zitronenschale': nw(47, 1.5, 0.3, 0.1, 5.4, 4.2, 10.6, 0.02, [], 'USDA lemon peel (KH exkl. Ballaststoffe umgerechnet)'),
  'Kartoffeln': nw(71, 1.9, 0.1, 0, 14.8, 0.8, 1.8, 0.01, [], 'BLS/Lebensmittelklarheit Kartoffeln geschält gekocht; bestätigt (Marten 22.07.2026): gegart verwogen'),
  'Kartoffelwürfel': nw(71, 1.9, 0.1, 0, 14.8, 0.8, 1.8, 0.01, [], 'wie Kartoffeln (geschält gekocht)'),
  'Zwiebel': nw(28, 1.2, 0.2, 0, 4.9, 4.2, 1.8, 0.01, [], 'BLS Zwiebel roh'),
  'Röstzwiebeln': nw(580, 6.0, 44.0, 20.0, 40.0, 15.0, 4.5, 1.0, ['Aa'], 'das-ist-drin.de Kühne Röstzwiebeln (Zutaten: Zwiebeln, Pflanzenöl, WEIZENMEHL, Salz)'),
  'Peperoni': nw(22, 0.8, 0.4, 0.1, 4.6, 2.5, 1.5, 1.2, [], 'fddb Durchschnitt Peperoni eingelegt; Etikett (Marten 22.07.2026): Peperoni, Wasser, Branntweinessig, Salz, Säuerungsmittel Citronensäure — KEIN Sulfit, keine Allergene'),
  'Tomatenflocken': nw(331, 12.0, 2.8, 0.5, 53.5, 35.0, 13.0, 0.15, [], 'teefabrik.de (Biller) Tomatenflocken getrocknet; Eiweiß/Zucker/Ballaststoffe ergänzt nach USDA getrocknete Tomaten'),

  // ── Süßes, Nüsse, Backzutaten (Web) ──
  'Kakao': nw(339, 23.0, 20.0, 12.4, 18.0, 1.0, 26.0, 0.05, [], 'naehrwertrechner.de (BLS) Kakaopulver schwach entölt (20-22% Fett, Bäcker-Standard); Salz konservativ 0,05'),
  'Kuvertüre': nw(570, 5.5, 38.0, 24.0, 45.0, 40.0, 9.0, 0.02, ['F'], 'Mittel Alnatura/dennree/REWE Zartbitter-Kuvertüre (567-578 kcal); bestätigt (Marten 22.07.2026): Sojalecithin → F'),
  'Zartbitter-Kuvertüre': nw(570, 5.5, 38.0, 24.0, 45.0, 40.0, 9.0, 0.02, ['F'], 'Mittel Alnatura/dennree/REWE Zartbitter-Kuvertüre; bestätigt (Marten 22.07.2026): Sojalecithin → F'),
  'Schokoraspel': nw(510, 6.5, 28.0, 17.0, 54.0, 50.0, 8.0, 0.01, ['F'], 'RUF/BENZ Raspelschokolade Zartbitter (510-520 kcal); Ballaststoffe typ. Zartbitter ergänzt; bestätigt (Marten 22.07.2026): Sojalecithin → F'),
  'Krokant': nw(480, 5.0, 17.0, 1.5, 72.0, 66.0, 3.5, 0.02, ['Hb'], 'Mittel fddb/EdelGut/RUF Haselnusskrokant (430-546 kcal je Nussanteil); bestätigt (Marten 22.07.2026): Haselnusskrokant (Hb)'),
  'Marzipan': nw(512, 12.0, 35.0, 2.7, 37.0, 37.0, 10.0, 0.03, ['Ha'], 'naehrwertrechner.de (BLS)/fddb Marzipanrohmasse; GFS aus Mandelfett-Anteil'),
  // 'Creme-Marzipan' ENTFERNT (Marten 22.07.2026): den Artikel gibt es
  // nicht — Tippfehler im Rezept Schlemmerriegel, gemeint ist die
  // Creme-MARGARINE (CSM Homann Creme → herstellerErgaenzungen.js).
  // Rezept korrigiert, DB-Eintrag per Cleanup gelöscht.
  'gehackte Nüsse': nw(628, 15.0, 61.0, 4.5, 6.0, 4.3, 10.0, 0.01, ['Hb'], 'Haselnüsse (app-interne ZUTAT_NAEHRWERTE); bestätigt (Marten 22.07.2026): immer Haselnüsse → Hb statt generisch H'),
  'Gemahlene Nüsse': nw(628, 15.0, 61.0, 4.5, 6.0, 4.3, 10.0, 0.01, ['Hb'], 'Haselnüsse (app-interne ZUTAT_NAEHRWERTE); bestätigt (Marten 22.07.2026): immer Haselnüsse → Hb statt generisch H'),
  'Puddingpulver': nw(370, 0.5, 0.2, 0.1, 91.0, 0.5, 0.3, 0.1, [], 'fddb/yazio Puddingpulver Vanille unzubereitet (360-382 kcal); Standard-Rezeptur Maisstärke = allergenfrei'),
  // 'Kochcreme' = Dr.-Oetker-Puddingpulver zum Kochen (laut Marten
  // 2026-07-17) — gleiche Werte wie 'Puddingpulver' (Pulver unzubereitet,
  // Maisstärke-Basis, laut Zutatenliste Stärke/Salz/Aroma allergenfrei).
  'Kochcreme': nw(370, 0.5, 0.2, 0.1, 91.0, 0.5, 0.3, 0.1, [], 'Dr. Oetker Puddingpulver zum Kochen (laut Marten); Werte wie Puddingpulver unzubereitet (fddb/yazio)'),
  // 'Pizza-Quick': WAR hier als Rinne Art. 223 geseedet — laut IREKS-
  // Qualitätszertifikat 124100 (Marten, 17.07.2026) ist es aber ein
  // IREKS-Produkt → jetzt in client/src/data/ireks.js (hat Vorrang);
  // der alte DB-Eintrag wurde gelöscht (cleanup-pizza-quick).
  'Streusel': nw(451, 5.3, 20.5, 10.5, 60.5, 25.2, 1.8, 0.15, ['Aa'], 'BERECHNET aus Standard-Streusel 2:1:1 (Weizenmehl 550 : Zucker : Homann Back Margarine, alle app-intern/PDF); Margarine laktosefrei → nur Aa'),
  'Vanille': nw(318, 3.9, 3.3, 0.8, 56.0, 55.4, 24.4, 0.01, [], 'fddb Rapunzel Bourbon-Vanille gemahlen; GFS geschätzt'),

  // ── Zutaten, die eigene REZEPTE sind (laut Marten 2026-07-17) ──
  // BERECHNET aus den DB-Rezepten per server/scripts/berechne-rezept-
  // zutaten.js (pro 100 g rohe Mischung/Teig). Bei Rezeptänderung an
  // 'Brotmischung' oder 'Urstück': Skript neu laufen lassen, Werte hier
  // aktualisieren, Seed erneut ausführen!
  // GRENZEN: Spuren der Unterprodukte (Panitop: Ac,Ad,C,F,G) können
  // über Custom-Einträge nicht weitergegeben werden.
  // Neu berechnet 2026-07-22 MIT Brotgewürz Optimal (vorher 0-Beitrag):
  // kcal 241→281, Allergen Ac (Gerste, aus dem Gewürz-Malzanteil) neu.
  'Brotmischung': nw(281, 13.1, 2.6, 1.2, 48.3, 0.7, 3.4, 18.83, ['Aa', 'Ab', 'Ac'], 'BERECHNET aus Rezept "Brotmischung" (Stand 2026-07-22, inkl. Brotgewürz Optimal); bei Rezeptänderung neu berechnen (berechne-rezept-zutaten.js)'),
  // 'Mischung' = Brotmischung (laut Marten 2026-07-17 dasselbe)
  'Mischung': nw(281, 13.1, 2.6, 1.2, 48.3, 0.7, 3.4, 18.83, ['Aa', 'Ab', 'Ac'], '= Brotmischung (laut Marten dasselbe); BERECHNET aus Rezept "Brotmischung" (Stand 2026-07-22, inkl. Brotgewürz Optimal)'),
  // 'Urstückteig' = Rezept 'Urstück' (Saaten-Quellteig); enthält selbst
  // Brotmischung — mit dem berechneten Wert von oben aufgelöst.
  // (Neuberechnung 2026-07-22: Werte unverändert, Brotmischung-Anteil klein.)
  'Urstückteig': nw(261, 10.0, 11.8, 1.4, 26.5, 1.1, 6.8, 1.14, ['Aa', 'Ab', 'Ac', 'Ad', 'K'], 'BERECHNET aus Rezept "Urstück" (Stand 2026-07-22); bei Rezeptänderung neu berechnen (berechne-rezept-zutaten.js)'),

  // ── Gewürze, Sonstiges (Web) ──
  'Backpulver': nw(86, 0.1, 0, 0, 21.4, 0.3, 0, 44.8, [], 'fddb RUF Backpulver; hoher LMIV-Salzwert korrekt (Natriumsalze der Triebmittel, kein NaCl)'),
  'Backextrakt': nw(311, 3.3, 0.1, 0, 74.0, 50.0, 0, 0.05, ['Ac'], 'hobbybaecker.de Malzextrakt/Backextrakt aus Gerste; bestätigt (Marten 22.07.2026): flüssiges Gerstenmalzextrakt (Ac)'),
  'Muskat': nw(525, 5.8, 36.3, 25.9, 28.5, 3.0, 20.8, 0.04, [], 'USDA Muskatnuss gemahlen (KH exkl. Ballaststoffe umgerechnet)'),
  'Currypulver': nw(332, 13.2, 11.6, 1.2, 26.9, 8.4, 0, 0.14, [], 'Fuchs Professional Curry Madras (Herstellerangaben fuchsgruppe.shop); bestätigt (Marten 22.07.2026): Zutaten nur Gewürze, keine Allergen-Zutat; Ballaststoffe nicht ausgewiesen → 0'),
  'Stollengewürz': nw(341, 0.6, 0.2, 0.1, 82.0, 0.1, 0, 0.1, ['G'], 'Martin Braun "Stollen fein" Art. 1310001 (Marten 22.07.2026): Zutaten LAKTOSE; Macis; Kardamom; Aroma; Jamaica-Rum → ALLERGEN MILCH/LAKTOSE (G); Nährwerte geschätzt (Laktose-Basis), Datenblatt im MB-LMIV-Portal'),
  'Paprika': nw(282, 14.1, 12.9, 2.1, 19.1, 10.3, 34.9, 0.17, [], 'USDA Paprikapulver edelsüß; bestätigt (Marten 22.07.2026): reines Paprikapulver'),
  'Chili': nw(318, 12.0, 17.3, 3.3, 29.4, 10.3, 27.2, 0.08, [], 'USDA Cayennepfeffer; bestätigt (Marten 22.07.2026): reines Chilipulver/-flocken'),
  'Rosmarin': nw(331, 4.9, 15.2, 7.4, 21.1, 0, 42.6, 0.13, [], 'USDA/fddb Rosmarin getrocknet; bestätigt (Marten 22.07.2026): getrocknete Ware'),
  'Schnittlauch': nw(30, 3.0, 1.0, 0.2, 4.0, 1.0, 1.0, 0.03, [], 'ernaehrung.de (BLS) Schnittlauch frisch; Zucker geschätzt'),
  'Rum': nw(246, 0, 0, 0, 0, 0, 0, 0, [], 'wikifit/yazio Rum 40 Vol.% (kcal je 100 ml ≈ 100 g gesetzt)'),
  'Kaffeepulver': nw(340, 4.5, 0.5, 0.2, 75.0, 3.0, 0, 0.1, [], 'fddb löslicher Standardkaffee (Pulver); bestätigt (Marten 22.07.2026): Instantkaffee (Tiramisu-Tränke); Zucker geschätzt'),
};

// ── Seed-Ausführung (nur bei direktem Aufruf, nicht beim Import) ──
async function main() {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
  const { default: pg } = await import('pg');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL fehlt (server/.env) — Abbruch.');
    process.exit(1);
  }
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: process.env.DATABASE_URL.includes('neon.tech') },
  });

  let eingefuegt = 0, aktualisiert = 0, geschuetzt = 0;
  for (const [name, data] of Object.entries(NAEHRWERT_ERGAENZUNGEN)) {
    const vorher = await pool.query('SELECT data FROM custom_ingredients WHERE name = $1', [name]);
    const res = await pool.query(
      `INSERT INTO custom_ingredients (name, data) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
       WHERE custom_ingredients.data ? 'quelle'`,
      [name, JSON.stringify(data)]
    );
    if (vorher.rows.length === 0) eingefuegt++;
    else if (res.rowCount === 1) aktualisiert++;
    else {
      geschuetzt++;
      console.log(`GESCHÜTZT (von Marten gepflegt, nicht überschrieben): ${name}`);
    }
  }
  console.log(`Fertig: ${eingefuegt} neu, ${aktualisiert} aktualisiert (Seed-eigene), ${geschuetzt} geschützt.`);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM custom_ingredients');
  console.log(`custom_ingredients gesamt: ${rows[0].n}`);
  await pool.end();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
