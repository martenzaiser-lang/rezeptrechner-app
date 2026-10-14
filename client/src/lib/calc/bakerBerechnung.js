// Zentrale Baker-Berechnung: dispatcht je nach Rezept-Modus
// (blech / multi-produkt / stueck), wendet den Teiler an und liefert
// alles, was Anzeige und Druck brauchen. Logik 1:1 aus calcBaker der
// alten App (index.html Z. 2782-2842).

import { skaliere, skaliereBlech, blechFaktor, schluesselzahl as einzelSchluesselzahl } from './skalierung.js';
import { skaliereMultiProdukt, multiSchluesselzahl } from './multiprodukt.js';

// eingabe: { stueck, blechN, blechB, blechL, produktStueck, faktor }
export function berechneBaker(r, eingabe) {
  try { return berechne(r, eingabe); }
  catch (err) { return { fehler: err.message, sk: [], teigGesamtKg: 0, schluesselzahl: 0, faktor: 1 }; }
}

function berechne(r, eingabe) {
  const isBlech = r.berechnung === 'blech';
  const hasMulti = !isBlech && r.produkte && r.produkte.length > 1;
  const faktor = eingabe.faktor ?? 1;
  if (!Number.isFinite(faktor) || faktor < 0) throw new Error('Ungültiger Teiler.');

  let sk = [];
  let schluesselzahl = 1;
  let blechAnzahl = 0;

  if (isBlech) {
    blechAnzahl = Math.max(0, Number(eingabe.blechN ?? 1));
    sk = skaliereBlech(r, eingabe.blechN, eingabe.blechB, eingabe.blechL);
    schluesselzahl = blechFaktor(r, eingabe.blechN, eingabe.blechB, eingabe.blechL);
  } else if (hasMulti) {
    const map = eingabe.produktStueck || {};
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    sk = skaliereMultiProdukt(r, map);
    schluesselzahl = multiSchluesselzahl(r, map);
  } else {
    const n = Math.max(0, eingabe.stueck || 0);
    if (n <= 0) return null;
    schluesselzahl = einzelSchluesselzahl(r, n);
    sk = skaliere(r, n);
  }

  if (!sk || !sk.length) return null;

  // Teiler anwenden (nicht im Blech-Modus — wie Original)
  if (!isBlech && faktor !== 1) {
    sk = sk.map((v) => v * faktor);
    schluesselzahl *= faktor;
  }

  const teigGesamtKg = sk.reduce((a, b) => a + b, 0);
  const stueckzahl = isBlech ? 0 : faktor * (hasMulti ? r.produkte.reduce((s, p) => s + (eingabe.produktStueck?.[p.name] || 0) * (p.stueck_pro_presse || 1), 0) : (eingabe.stueck || 0));

  return {
    sk,
    schluesselzahl,
    teigGesamtKg,
    stueckzahl,
    blechAnzahl,
    proBlechKg: blechAnzahl > 1 ? teigGesamtKg / blechAnzahl : null,
    faktor,
    isBlech,
    hasMulti,
  };
}

// Teig-Zusammenfassung bei prozentualen Zusaetzen (Einzelprodukt-Variante,
// Original Z. 2880-2881): "X kg Teig + Fuellung (Y kg) + ..."
export function teigZusammenfassung(r, sk, teigGesamtKg) {
  const pz = {};
  r.zutaten.forEach((z, i) => {
    if (!(!z.ist_kommentar && z.zusatz_prozent > 0 && !(z.menge_kg > 0))) return;
    const w = sk[i] || 0;
    if (!w) return;
    const sn = z.bemerkung ? z.bemerkung.split('–')[0].trim() : z.name;
    pz[sn] = (pz[sn] || 0) + w;
  });
  if (!Object.keys(pz).length) return null;
  const pt = Object.values(pz).reduce((a, b) => a + b, 0);
  return { teigKg: teigGesamtKg - pt, gruppen: pz };
}
