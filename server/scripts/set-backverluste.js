// Backverluste für die LMIV-Nährwertberechnung setzen (Live-DB!).
//
// backverlust_pct wird NUR im LmivBlock verwendet (Nährwerte pro 100 g
// gebacken, Faktor 100/(100−BV)) — die Rezept-/Mengenberechnung
// (skalierung.js) nutzt das Feld nicht, ta.js:rohgew() ist unbenutzt.
// Ein gesetzter Backverlust ändert also KEINE Produktionszahlen.
//
// Quellen der Richtwerte (Recherche 2026-07-17):
//   - Brot 8–14 % je nach Größe/Krustenanteil (ploetzblog.de/baeckerlatein,
//     josemola.de, diebackstube.de)
//   - Brötchen/Kleingebäck 18–22 % (diebackstube.de, rezeptrechner-online.de)
//   - Rührkuchen 7–12 % (feinebackwaren.de)
//   - Hefefeingebäck/Blechkuchen/Plunder 10 % (IREKS-Qualitätszertifikat
//     133000 MELLA-HT-SUPERSOFT, Verarbeitungsempfehlung — Primärquelle!)
//   - Siedegebäck (Berliner): Fettaufnahme ~10 % kompensiert den
//     Frittier-Wasserverlust (theworldofbaking.com) → Faktor wäre
//     irreführend, daher 0 (Nährwerte bleiben "pro 100 g Teig")
//
// Idempotent + schützend: aktualisiert NUR Rezepte, deren
// backverlust_pct aktuell 0 oder nicht gesetzt ist. Von Marten im
// Rezept-Editor gepflegte Werte werden NIE überschrieben.
// version wird erhöht, damit Clients die Änderung per Polling/ETag sehen.
//
// Aufruf:  cd server && node scripts/set-backverluste.js

import { pathToFileURL } from 'node:url';

// name → [backverlust_pct, Begründung]
export const BACKVERLUSTE = {
  // ── Brote < 700 g (mehr Oberfläche/Kruste je kg) → 13 % ──
  'Buchweizen-Hirsebrot': [13, 'Brot 550 g'],
  'Chiabrot': [13, 'Brot 550 g'],
  'Dinkel - Porridge': [13, 'Brot 550 g'],
  'Dinkelvollkorn mit Skyr': [13, 'Brot 550 g'],
  'Frühlingsbrot': [13, 'Brot 550 g'],
  'Herbstbrot': [13, 'Brot 550 g'],
  'Sommerbrot': [13, 'Brot 550 g'],
  'Winterbrot': [13, 'Brot 550 g'],
  'Kartoffelbrot': [13, 'Brot 550 g'],
  'Kürbis Lupinenbrot': [13, 'Brot 550 g'],
  'Linsenbrot': [13, 'Brot 550 g'],
  'Pfefferkruste': [13, 'Brot 550 g'],
  'Rosmarinbrot': [13, 'Brot 550 g'],
  'Rote - Bete Brot': [13, 'Brot 550 g'],
  'Süßkartoffelbrot': [13, 'Brot 550 g'],
  'Dinkel fein': [13, 'Brot 500 g'],
  'Dinkel grob': [13, 'Brot 500 g'],
  'Dinkelsemmel': [13, 'Brot 500 g'],
  'Walnusskruste': [13, 'Brot 600 g'],
  'Wyndbergbrot': [13, 'Brot 250 g'],

  // ── Brote 850–1200 g → 12 % ──
  'Alpenkruste': [12, 'Brot 850 g'],
  'Delikatessbrot': [12, 'Brot 850 g'],
  'Dinkel Haferbrot': [12, 'Brot 850 g'],
  'Hopfenbrot': [12, 'Brot 850 g'],
  'Katenkruste': [12, 'Brot 850 g'],
  'Urstück': [12, 'Brot 850 g'],
  'Holzfällerbrot': [12, 'Brot 1150 g'],
  'Joghurt Dinkelbrot': [12, 'Brot 1150 g'],
  'Nussbrot': [12, 'Brot 1200 g'],
  'Vollkorn - Möhre': [12, 'Brot 1150 g'],
  'Tessiner Landbrot': [12, 'Brot 1000 g'],
  'Roggenteig': [12, 'Teig für Roggenbrot ~1 kg'],

  // ── Großbrote / saftige Kastenbrote → 10 % ──
  'Mischbrot': [10, 'Großbrot 3 kg (weniger Kruste je kg)'],
  'Normale mit Poolish': [10, 'Großbrot 3 kg'],
  'Vollkornbrot': [10, 'Großbrot 2,2 kg'],
  'Lüneburger Schwarzbrot': [10, 'Kasten-Schwarzbrot, saftige Krume'],

  // ── Sonderfälle Brot ──
  'Fladenbrot': [15, 'Fladen: flach, viel Oberfläche, kurze Backzeit'],
  'Focaccia Romana Fladen': [15, 'Fladen: flach, viel Oberfläche'],
  'Knäckebrot': [30, 'Knäcke wird trocken ausgebacken (sehr hoher Verlust)'],
  'Spicygebäck': [18, 'Kleingebäck 300 g'],
  'Dinkelecke': [18, 'Ecken = Kleingebäck (viel Oberfläche)'],

  // ── Brötchen/Kleingebäck → 20 % (18–22 % üblich) ──
  'Normale Brötchen': [20, 'Brötchen'],
  'Sauerteigbrötchen': [20, 'Brötchen'],
  'Dinkel-Sauerteigbrötchen': [20, 'Brötchen'],
  'Roggenbrötchen': [20, 'Brötchen'],
  'Malzbrötchen': [20, 'Brötchen'],
  'Schrotbrötchen': [20, 'Brötchen'],
  'Weltmeisterbrötchen': [20, 'Brötchen'],
  'Ganzkorn/Kürbisbrötchen': [20, 'Brötchen'],
  'Feta Peperonibrötchen': [20, 'Brötchen'],
  'Baguetteteig': [21, 'Baguette: viel Kruste, lange Form'],
  'Laugengebäck': [18, 'Laugengebäck: kürzere Backzeit als Brötchen'],
  'Burgerbrötchen': [15, 'Softbun: wenig Kruste, weich gebacken'],

  // ── Hefefeingebäck / Blechkuchen / Plunder → 10 % (IREKS-Zertifikat) ──
  'Zöpfe/Schnecken': [10, 'Hefefeingebäck (IREKS-Zertifikat 133000: 10 %)'],
  'Kürbisstuten': [10, 'Hefefeingebäck (Stuten)'],
  'Butterkuchen': [10, 'Blechkuchen (IREKS-Zertifikat 133000: 10 %)'],
  'Stollen': [10, 'Stollen: dicht, fettreich'],
  'Semmelrezept': [10, 'Rosinen-Hefegebäck (Milch/Fett/Rosinen → Feingebäck)'],
  'Marzipan-Striezel': [10, 'Hefe-Striezel'],
  'Mohnstriezel': [10, 'Hefe-Striezel'],
  'Quarkstriezel': [10, 'Hefe-Striezel'],
  'Kirsch und Mandarinenkränze': [10, 'Hefekränze mit Fruchtauflage'],
  'Franzbrötchen': [12, 'kleines laminiertes Gebäck (mehr Oberfläche)'],
  'Croissantteig': [10, 'Plunder-/Croissantteig (IREKS: Plunder 10 %)'],
  'Plunderteig': [10, 'Plunderteig (IREKS: Plunder 10 %)'],
  'Blätterteig': [15, 'Blätterteig wird knusprig ausgebacken — SCHÄTZUNG'],
  'Mürbeteig': [8, 'Mürbeteig: fettreich, wenig Wasser (Rührkuchen 7–12 %)'],

  // ── Kuchen ──
  'Apfelkuchen': [10, 'Blechkuchen'],
  'Kirschkuchen': [10, 'Blechkuchen'],
  'Mohnkuchen': [10, 'Blechkuchen'],
  'Zwiebelkuchen': [10, 'Blechkuchen'],
  'Bienenstich': [10, 'Blechkuchen'],
  'Donauwelle': [10, 'Blechkuchen (Rührmasse)'],
  'Käsekuchen 80x50': [10, 'Käsekuchen: verliert v.a. Feuchte der Quarkmasse'],
  'Nussecken': [10, 'Mürbeteig + Nussmasse'],
  'Schlemmerriegel': [10, 'Rührmasse (7–12 %)'],
  'Amerikanerschnitte': [10, 'gebackener Boden + Baiser (Sahnefüllung ungebacken) — Näherung'],
  'Sandtortenmasse': [10, 'Rührmasse (7–12 %)'],
  'Spanische': [12, 'Biskuit-/Marzipanmasse'],
  'Biskuit Kapseln': [12, 'Biskuit'],
  'Tortenböden': [12, 'Biskuit'],
  'Stachelbeer Baiser': [12, 'Kuchen mit Baiserauflage (Baiser trocknet stark)'],
  'Rhabarber-Baiser': [12, 'wie Stachelbeer Baiser (Rezept noch ohne Zutaten)'],
  'Mandelbogen': [15, 'dünne Makronenmasse, stark ausgebacken'],

  // ── Ungebacken / Halbfabrikate → 0 % (Nährwerte pro 100 g korrekt) ──
  'Tiramisu': [0, 'ungebacken'],
  'Käse-Sahne': [0, 'Füllung ungebacken'],
  'Frankfurter Füllung': [0, 'Puddingfüllung, ungebacken'],
  'Himbeerrolle': [0, 'Rezept = Sahnefüllung, ungebacken'],
  'Zitronenrolle': [0, 'Rezept = Sahnefüllung, ungebacken'],
  'Streusel': [0, 'Halbfabrikat (wird auf Kuchen mitgebacken)'],
  'Brotmischung': [0, 'Trockenmischung, ungebacken'],
  'Spicy Topping': [0, 'Würzmischung, ungebacken'],
  'Berlinerteig': [0, 'Siedegebäck: Fettaufnahme (~10 %) kompensiert Frittierverlust — Faktor wäre irreführend'],
};

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

  let gesetzt = 0, geschuetzt = 0, unveraendert = 0, fehlt = 0;
  for (const [name, [bv, grund]] of Object.entries(BACKVERLUSTE)) {
    const res = await pool.query('SELECT data FROM recipes WHERE name = $1', [name]);
    if (res.rows.length === 0) {
      console.log(`FEHLT in DB: ${name}`);
      fehlt++;
      continue;
    }
    const aktuell = parseFloat(res.rows[0].data.backverlust_pct) || 0;
    if (aktuell === bv) { unveraendert++; continue; }
    if (aktuell !== 0) {
      console.log(`GESCHÜTZT (von Marten gepflegt: ${aktuell} %, Skript-Wert wäre ${bv} %): ${name}`);
      geschuetzt++;
      continue;
    }
    await pool.query(
      `UPDATE recipes
       SET data = jsonb_set(data, '{backverlust_pct}', to_jsonb($2::numeric)),
           version = version + 1, updated_at = now(), updated_by = 'set-backverluste'
       WHERE name = $1`,
      [name, bv]
    );
    console.log(`${name}: 0 → ${bv} % (${grund})`);
    gesetzt++;
  }
  console.log(`\nFertig: ${gesetzt} gesetzt, ${unveraendert} schon korrekt, ${geschuetzt} geschützt, ${fehlt} nicht gefunden.`);
  await pool.end();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
