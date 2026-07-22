// Import der BÄKO-KBO-Preisliste (kbo_alle_filialen.csv) in die Tabelle
// prices. Format: Semikolon, Windows-1252, Spalten u.a. Artikelbezeichnung,
// Preis (Komma-Dezimal), PE (Preiseinheit: Preis gilt je PE Einheiten,
// also €/kg = Preis / PE), Gr. (Einheit).
//
// WICHTIG: Die Zuordnung Zutat → Artikel ist eine GEPFLEGTE Liste (unten),
// kein Fuzzy-Matching — Artikelnamen wie "Dawn Sylvia Obstkuchen" oder
// "Meister Sahnessa Zitrone" sind per Substring nicht sicher zuordenbar.
// Der In-App-CSV-Import (parseBaekoCSV) kann dieses Format NICHT lesen
// (seine Heuristik hält die Gebinde-Spalte "1,000" für den Preis).
//
// Nur kg-Artikel werden importiert (L/St/Ds/Pa haben keine €/kg-Basis).
// Aufruf:  cd server && node scripts/import-kbo-preise.js [pfad-zur-csv]
//          Standardpfad: C:/Users/marte/Downloads/kbo_alle_filialen.csv

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pool } from '../db.js';

const CSV_PFAD = process.argv[2] || 'C:/Users/marte/Downloads/kbo_alle_filialen.csv';
const LIEFERANT = 'BÄKO (KBO-Liste)';

// Zutat (exakt wie in den Rezepten) → Artikelbezeichnung (exakt wie in der
// KBO-Liste, Mehrfach-Leerzeichen egal). Mit ANNAHME markierte Zuordnungen
// bei Gelegenheit von Marten bestätigen lassen.
const ZUORDNUNG = {
  // ── Mehle & Getreide ──
  'Weizenmehl 550': 'Roland 550 Spez.Brötchenmehl',
  'Weizenmehl Type 550': 'Roland 550 Spez.Brötchenmehl',
  'Weizemehl': 'Roland 550 Spez.Brötchenmehl',
  'Mehl': 'Roland 550 Spez.Brötchenmehl',
  'Hartweizengrieß': 'Rüning. Hartweizengrieß grob',
  'Hartweizengreiß': 'Rüning. Hartweizengrieß grob',
  'Roggenmehl 997': 'BÄKO Roggenmehl 997',
  'Roggenmehl 1150': 'BÄKO Roggenmehl 997', // ANNAHME: nur 997 gelistet
  'Roggenmehl 1370': 'BÄKO Roggenmehl 997', // ANNAHME: nur 997 gelistet
  'Roggenvollkornmehl': 'BÄKO Roggenvollkornmehl',
  'Roggenvollkorn': 'BÄKO Roggenvollkornmehl',
  'Roggenschrot': 'BÄKO Roggenvollkornschrot fein',
  'Roggenschrot fein': 'BÄKO Roggenvollkornschrot fein',
  'Roggenschrot (fein)': 'BÄKO Roggenvollkornschrot fein',
  'Roggenschrot, Fein': 'BÄKO Roggenvollkornschrot fein',
  'Roggenschrot, Mittel': 'Rüningen Rog.VKS mittel',
  'Roggenkörner': 'BÄKO Roggen ganz gereinigt',
  'Roggenkörner (Katenbrot)': 'BÄKO Roggen ganz gereinigt',
  'Roggenkörner (gekocht)': 'BÄKO Roggen ganz gereinigt',
  'Roggenkörner(Mehrkornbrot)': 'BÄKO Roggen ganz gereinigt',
  'Roggenflocken': 'Oldend. Rogg.vollk.Flocken H1',
  'Dinkelvollkornmehl': 'Rün. Dinkelvollkornmehl',
  'Dinkelvollkorn': 'Rün. Dinkelvollkornmehl',
  'Dinkelschrot': 'Schapf. Dinkelschrot grob',
  'Dinkelkörner': 'Rüningen Dinkelkörner ganz',
  'Dinkelruchmehl': 'Roland Dinkel Ruchmehl',
  'Buchweizenvollmehl': 'Buchweizenmehl',
  'Haferkerne': 'Haferkerne geschält',
  'Haferflocken': 'Großblatthaferflocken',
  'Hirse': 'Hirse geschält',
  'Weizenstärke': 'Weizenstärke 3 Hasen',
  'Stärke': 'Weizenstärke 3 Hasen',
  // ── Saaten & Schrote ──
  'Sojaschrot': 'Sojaschrot',
  'Leinsaat': 'Leinsaat Reinheit mind.99,90%',
  'Leinsaat (eingeweicht)': 'Leinsaat Reinheit mind.99,90%',
  'Lupinenschrot': 'Lupinenschrot',
  'Süßlupine': 'Lupinenschrot', // ANNAHME: Lupinenschrot = Süßlupine
  'Mohn': 'Blaumohn',
  'Kürbiskerne': 'Kürbiskerne gesch. shine skin',
  'Sonnenblumenkerne': 'Sonnenblumenkerne bakery',
  'Sonnenblumenkerne (anrösten)': 'Sonnenblumenkerne bakery',
  'Sesam': 'Sesam Afrika, geschält',
  'Chiasamen': 'Chia Saat',
  'Kümmel': 'Kümmel ganz',
  // ── Zucker, Salz, Gewürze ──
  'Zucker': 'Nordz.Sandzucker fein',
  'Salz': 'Steinspeisesalz',
  'Brezelsalz (Zugabe verspätet)': 'Brezelsalz Bäckerstolz',
  'Zimt': 'Ceylon Zimt gem.',
  // ── Milchprodukte, Fette, Hefe ──
  'Skyr': 'Mertens Skyr',
  'Sahne': 'Mertens Schlagsahne 33%',
  'Joghurt': 'FS Joghurt 3,5%',
  'Quark': '2 Plus Speisequark Magerstufe',
  'Schmand': 'FS Schmand 24%',
  'Butter': 'Markenbutter Block 10kg', // ANNAHME: Block, nicht 4x2,5-Stg. (5,19)
  'Gouda': 'Gouda ger.4mm 5x2kg 48%',
  'Fetakäse': 'Rücker Hirtenkäse gewürfelt',
  'Margarine': 'SP Backmarg.CL PO RSPO MB',
  'Fett': 'Meister Goldbiskin Super', // ANNAHME: Siedefett
  'Frischhefe': "Frischbackhefe 'frohnatur'",
  // ── Backmittel & Markenprodukte ──
  'Stabilase': 'Ir.Stabilase',
  'Eiszeit': 'Ir.Eiszeit',
  'Spicy Topping': 'Ir.Spicy Topping',
  'Classic Baguette': 'Ir.Classic Baguette',
  'Classis Baguette': 'Ir.Classic Baguette',
  'Baguette-Backmittel': 'Ir.Classic Baguette',
  'Panitop - Roggen': 'Ir.Panitop-Roggen',
  'Lievito Madre Dolce': 'Ir. Lievito Madre Dolce',
  'Mella HT SuperSoft': 'Ir.Mella HT-Supersoft',
  'Mella HT SUPER': 'Ir.Mella HT-Supersoft',
  'Berliner SuperSoft': 'Ir.Mella Berliner-Supersoft',
  'Mellasand': 'Ir.Mella Sand Biskuit',
  'Biskuit-Mehl': 'Meister Biskuit',
  'Käsekuchenpulver': 'Meister Käsekuchen-Basis',
  'Brötchenbackmittel': 'Ir.Weizenback 1856', // ANNAHME
  'Kochcreme': 'Komplet Bourbon Kochcreme',
  'Puddingpulver': 'Ir.Mella Bourbon Vanillekrem', // ANNAHME
  'Silvia': 'Dawn Sylvia Obstkuchen 3652',
  'Eisella Mohn': 'Meister eisella Mohn',
  'Eiweiß-Mix': 'Meister Eiweiß-Mix',
  'Meister Eiweiß Mix': 'Meister Eiweiß-Mix',
  'Meister Rühr & Easy': 'Meister Rühr & Easy PO SG',
  'Easy Rühr': 'Meister Rühr & Easy PO SG',
  'Saftbinder': 'Meister Saftbinder 100',
  'Saftin Kirsch': 'Meister Saftin Kirsch',
  'Variopan (Meistermarken)': 'Meister Variopan',
  'Erdbeere-Sahnessa': 'Meister Sahnessa Erdbeer *',
  'Himbeere-Sahnessa': 'Meister Sahnessa Himbeer',
  'Zitrone-Sahnessa': 'Meister Sahnessa Zitrone',
  'Neutral-Sahnessa': 'Meister Sahnessa Neutral',
  'Sahnessen Käse-Sahne': 'Meister Sahn.Käse-Sahne-Torte',
  'Roggenmalz': 'Roggenmalzpulver',
  'Backpulver': 'BÄKO Backpulver',
  'Kartoffelflocken': 'Emsland Kartoffelflocken',
  // ── Früchte, Gemüse, Süßes ──
  'Honig': 'Backhonig',
  'Rübensirup': 'Hellmi Grafschafter Goldsaft',
  'Sirup': 'Hellmi Grafschafter Goldsaft',
  'Kakao': 'De Zaan Kakaopulver 20/22%',
  'Kuvertüre': 'BÄKO dunkle Kuvertüre Chips',
  'Zartbitter-Kuvertüre': 'BÄKO dunkle Kuvertüre Chips',
  'Streusel': 'BÄKO Spezialstreusel',
  'Krokant': 'BÄKO Nusskrokant',
  'Marzipan': 'Lubeca Marzipan O CAL',
  'Zitronat': 'BÄKO Sukkade 3x3 mm',
  'Orangeat': 'BÄKO Orangeat 3x3 mm',
  'Rosinen': 'BÄKO türk.Sultanas Typ 10 med.',
  'Rosine': 'BÄKO türk.Sultanas Typ 10 med.',
  'Mandeln gehobelt': 'Mandeln extra dünn gehobelt',
  'Mandeln gehackt': 'Mandeln gehackt',
  'Mandeln (gehackt)': 'Mandeln gehackt',
  'gehackte Mandeln': 'Mandeln gehackt',
  'Haselnüsse': 'Haselnusskerne 11/13mm Vakuum',
  'gehackte Nüsse': 'Haselnusskerne geha.ger.2-4mm', // ANNAHME: Nüsse = Haselnüsse
  'Gemahlene Nüsse': 'Haselnussgrieß blanchiert', // ANNAHME: Nüsse = Haselnüsse
  'Walnüsse': 'Walnusskernbruch hell 2x5kg',
  'Sauerkirschen': 'TK-Sauerkirschen',
  'Himbeere': 'TK-Himbeeren 4x2,5kg',
  'Kürbis': 'TK-Kürbiswürfel',
  'Kürbiswürfel': 'TK-Kürbiswürfel',
  'Rote-Bete': 'TK-Rote Bete 4x2,5kg',
  'Möhren': 'TK-Möhrenstifte',
  'Karottenstifte': 'TK-Möhrenstifte',
  'Schnittlauch': 'TK-Schnittlauch geschnitten',
  'Röstzwiebeln': 'BÄKO Röstzwiebeln 4x2,5kg',
  'Zwiebel': 'TK-Zwiebelwürfel 10mm',
  'Kartoffeln': 'Bö.Kartoffeln, Würfel gegart',
  'Kartoffelwürfel': 'Bö.Kartoffeln, Würfel gegart',
};

// CSV einlesen (Windows-1252 ≈ latin1 für die vorkommenden Zeichen)
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const artikel = new Map(); // normName -> { preisKg, gr, roh }
for (const line of readFileSync(CSV_PFAD, 'latin1').split(/\r?\n/).slice(1)) {
  const c = line.split(';');
  if (c.length < 10) continue;
  const name = norm(c[2]);
  const preis = parseFloat(c[8].replace(',', '.'));
  const pe = parseFloat(c[9]) || 1;
  const gr = c[4].trim().toLowerCase();
  if (!name || !Number.isFinite(preis) || preis <= 0) continue;
  artikel.set(name, { preisKg: preis / pe, gr, roh: c[2].trim() });
}
console.log(`${artikel.size} Artikel aus ${CSV_PFAD} gelesen`);

let ok = 0;
const fehler = [];
for (const [zutat, artikelName] of Object.entries(ZUORDNUNG)) {
  const a = artikel.get(norm(artikelName));
  if (!a) { fehler.push(`NICHT IN CSV: ${zutat} → ${artikelName}`); continue; }
  if (a.gr !== 'kg') { fehler.push(`KEINE kg-EINHEIT (${a.gr}): ${zutat} → ${artikelName}`); continue; }
  const preisKg = Math.round(a.preisKg * 10000) / 10000;
  await pool.query(
    `INSERT INTO prices (zutat_name, preis_eur_kg, lieferant, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (zutat_name) DO UPDATE
       SET preis_eur_kg = $2, lieferant = $3, updated_at = now()`,
    [zutat, preisKg, `${LIEFERANT}: ${a.roh}`]
  );
  console.log(`${zutat.padEnd(30)} ${preisKg.toFixed(4).padStart(9)} €/kg  ← ${a.roh}`);
  ok++;
}

console.log(`\n${ok} Preise importiert/aktualisiert.`);
if (fehler.length) {
  console.log('\nNicht importiert:');
  fehler.forEach((f) => console.log('  ' + f));
}
await pool.end();
