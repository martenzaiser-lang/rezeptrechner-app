// Skalierung (Stueck- und Blech-Modus) — 1:1 portiert aus der alten App
// (index.html Z. 2320-2361 skaliere, Z. 2796-2815 Blech-Zweig in calcBaker).
//
// Rueckgabe ist immer ein Array (Index = Zutat-Index im Rezept), damit
// doppelte Zutatennamen unterstuetzt werden. Fehlerhafte "Gesamt"-Zutaten
// werden aus der Berechnung gefiltert (ergeben 0).

export const getEinzelGewicht = (r) => {
  if (r.produkte && r.produkte.length === 1 && r.produkte[0].gewicht_g > 0) return r.produkte[0].gewicht_g;
  return r.stueckgewicht_g || 1000;
};

// Stueck-Modus: n Stueck × Einzelgewicht → Schluesselzahl ueber Basisteig.
export const skaliere = (r, n) => {
  const einzelGewicht = getEinzelGewicht(r);
  const zielG = n * einzelGewicht;
  // Basis ohne "Gesamt"-Zutat, nur positive Mengen.
  // WICHTIG: menge_kg hat Prioritaet vor zusatz_prozent.
  const cleanZutaten = r.zutaten.filter((z) => z.name.toLowerCase() !== 'gesamt' && z.menge_kg > 0);
  const basisG = cleanZutaten.reduce((s, z) => s + z.menge_kg, 0) * 1000;
  if (basisG === 0) return [];
  // Zusatz-Prozent-Summe NUR fuer reine Prozent-Zutaten (ohne menge_kg).
  // Prozent bezieht sich auf BASISTEIG, nicht Gesamtgewicht.
  const zusatzProzentSumme = r.zutaten
    .filter((z) => z.zusatz_prozent > 0 && !(z.menge_kg > 0))
    .reduce((s, z) => s + z.zusatz_prozent, 0);
  const divisor = 100 + zusatzProzentSumme;
  const normalZielG = divisor > 0 ? (zielG * 100) / divisor : zielG;
  const f = basisG > 0 ? normalZielG / basisG : 0;

  const scaled = r.zutaten.map((z) => {
    if (z.name.toLowerCase() === 'gesamt') return 0;
    if (z.zusatz_prozent > 0 && !(z.menge_kg > 0)) {
      return +Math.round(((normalZielG * (z.zusatz_prozent / 100)) / 1000) * 10000) / 10000;
    }
    if (z.menge_kg <= 0) return 0;
    return +Math.round(z.menge_kg * f * 10000) / 10000;
  });

  // Rundungskorrektur: Differenz auf groesste normale Zutat verteilen.
  const summeNormal = scaled.reduce(
    (a, b, i) => a + (r.zutaten[i]?.zusatz_prozent > 0 && !(r.zutaten[i]?.menge_kg > 0) ? 0 : b),
    0
  );
  const normalZielKg = normalZielG / 1000;
  const diff = +(normalZielKg - summeNormal).toFixed(4);
  if (Math.abs(diff) >= 0.01) {
    let maxIdx = 0;
    let maxVal = 0;
    scaled.forEach((v, i) => {
      if (v > maxVal && !(r.zutaten[i]?.zusatz_prozent > 0 && !(r.zutaten[i]?.menge_kg > 0))) {
        maxVal = v;
        maxIdx = i;
      }
    });
    if (maxVal > 0) scaled[maxIdx] = +(scaled[maxIdx] + diff).toFixed(2);
  }
  return scaled;
};

export const skaliereByFactor = (r, f) => {
  if (f <= 0) return [];
  return r.zutaten.map((z) =>
    z.name.toLowerCase() === 'gesamt' || z.menge_kg <= 0 ? 0 : +Math.round(z.menge_kg * f * 10000) / 10000
  );
};

// Blech-Modus (Kuchen): Skalierung ueber Flaeche relativ zum Basis-Blech
// des Rezepts (Default 50×80 cm).
export const blechFaktor = (r, anzahl, breite, laenge) => {
  const basisB = r.blech_breite_cm > 0 ? r.blech_breite_cm : 50;
  const basisL = r.blech_laenge_cm > 0 ? r.blech_laenge_cm : 80;
  const neuB = breite || basisB;
  const neuL = laenge || basisL;
  const neuN = Math.max(1, parseInt(anzahl) || 1);
  return (neuN * neuB * neuL) / (basisB * basisL);
};

export const skaliereBlech = (r, anzahl, breite, laenge) => {
  const faktor = blechFaktor(r, anzahl, breite, laenge);
  const basisGInKg = r.zutaten
    .filter((z) => z.menge_kg > 0 && !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt')
    .reduce((s, z) => s + z.menge_kg, 0);
  return r.zutaten.map((z) => {
    if (z.ist_kommentar || z.name.toLowerCase() === 'gesamt') return 0;
    if (z.menge_kg > 0) return +(z.menge_kg * faktor).toFixed(4);
    if (z.zusatz_prozent > 0) return +((basisGInKg * faktor * z.zusatz_prozent) / 100).toFixed(4);
    return 0;
  });
};

// Schluesselzahl im Stueck-Modus (Anzeige "sz-val" der alten App)
export const schluesselzahl = (r, n) => {
  const cleanZutaten = r.zutaten.filter((z) => z.name.toLowerCase() !== 'gesamt' && z.menge_kg > 0);
  const basisTeig = cleanZutaten.reduce((s, z) => s + z.menge_kg, 0) * 1000;
  if (basisTeig === 0) return 0;
  return (n * getEinzelGewicht(r)) / basisTeig;
};
