// Multi-Produkt-Skalierung — 1:1 portiert aus der alten App
// (index.html Z. 2362-2497 skaliereMultiProdukt, Z. 2816-2822 Schluesselzahl).
//
// Ein Rezept mit mehreren Produkten (z.B. ein Teig fuer verschiedene
// Gebaecke): produktStueckMap = { produktName: eingegebene Zahl }.
// Bei stueck_pro_presse > 0 ist die Eingabe die Anzahl PRESSEN,
// sonst die Stueckzahl direkt.

export const skaliereMultiProdukt = (r, produktStueckMap) => {
  // SCHRITT 1: Produktgewichte und Pressen
  const produktGewichte = {};
  const produktPressen = {};
  let totalGewicht = 0;
  let totalPressen = 0;
  (r.produkte || []).forEach((p) => {
    const eingabe = produktStueckMap[p.name] || 0;
    const gewichtG = p.gewicht_g || 0;
    const hatPressen = p.stueck_pro_presse > 0;
    const anzahlStueck = hatPressen ? eingabe * p.stueck_pro_presse : eingabe;
    const gew = anzahlStueck * gewichtG;
    produktGewichte[p.name] = gew;
    produktPressen[p.name] = hatPressen ? eingabe : 0;
    totalGewicht += gew;
    if (hatPressen) totalPressen += eingabe;
  });
  if (totalGewicht === 0) return [];

  const istReineProzentZutat = (z) => z.zusatz_prozent > 0 && !(z.menge_kg > 0) && !(z.menge_pro_presse > 0);
  const istProPresseZutat = (z) => z.menge_pro_presse > 0;
  const istProduktspezifisch = (z) => z.fuer_produkte && z.fuer_produkte.length > 0;

  // SCHRITT 2: Prozent-Anteil je Produkt (produktspezifische Prozent-Zutaten
  // sind TEIL des Produktgewichts, nicht zusaetzlich)
  const produktProzentAnteile = {};
  r.produkte.forEach((p) => {
    let prozentSumme = 0;
    r.zutaten.forEach((z) => {
      if (istReineProzentZutat(z) && istProduktspezifisch(z) && z.fuer_produkte.includes(p.name)) {
        prozentSumme += z.zusatz_prozent;
      }
    });
    produktProzentAnteile[p.name] = prozentSumme;
  });

  // SCHRITT 3: Basisteig-Bedarf
  // - Prozent <= 100%: Prozent vom Gesamtgewicht (z.B. Katenbrot 20% Koerner)
  // - Prozent > 100%: Prozent vom Teig (z.B. Stollen 143% Fuellung)
  let basisTeigBedarf = 0;
  const produktBasisteig = {};
  r.produkte.forEach((p) => {
    const gewicht = produktGewichte[p.name] || 0;
    const prozentAnteil = produktProzentAnteile[p.name] || 0;
    let basis;
    if (prozentAnteil > 100) {
      const divisor = 1 + prozentAnteil / 100;
      basis = divisor > 0 ? gewicht / divisor : 0;
    } else {
      basis = (gewicht * Math.max(0, 100 - prozentAnteil)) / 100;
    }
    produktBasisteig[p.name] = basis;
    basisTeigBedarf += basis;
  });

  // SCHRITT 4: Basisrezept-Teig (nur menge_kg-Zutaten bestellter Produkte)
  const bestellteProdukte = Object.keys(produktStueckMap).filter((pn) => produktStueckMap[pn] > 0);
  const basisZutaten = r.zutaten.filter((z) => {
    if (z.menge_kg <= 0 || z.name.toLowerCase() === 'gesamt' || istProPresseZutat(z)) return false;
    if (!istProduktspezifisch(z)) return true;
    return z.fuer_produkte.some((pn) => bestellteProdukte.includes(pn));
  });
  const basisTeig = basisZutaten.reduce((s, z) => s + z.menge_kg, 0) * 1000;
  if (basisTeig === 0 && totalPressen === 0) return [];

  // SCHRITT 5: Schluesselzahl
  const faktor = basisTeig > 0 ? basisTeigBedarf / basisTeig : 0;

  // SCHRITT 6: Zutaten skalieren
  const scaled = r.zutaten.map((z) => {
    if (z.name.toLowerCase() === 'gesamt') return 0;

    if (istProPresseZutat(z)) {
      let pressen = totalPressen;
      if (istProduktspezifisch(z)) {
        pressen = z.fuer_produkte.reduce((s, pn) => s + (produktPressen[pn] || 0), 0);
      }
      if (pressen === 0) return 0;
      return +Math.round(pressen * z.menge_pro_presse * 10000) / 10000;
    }

    if (istReineProzentZutat(z)) {
      if (istProduktspezifisch(z)) {
        let bezugsMenge = 0;
        z.fuer_produkte.forEach((pn) => {
          const prozentAnteil = produktProzentAnteile[pn] || 0;
          if (prozentAnteil > 100) {
            bezugsMenge += produktBasisteig[pn] || 0;
          } else {
            bezugsMenge += produktGewichte[pn] || 0;
          }
        });
        if (bezugsMenge === 0) return 0;
        return +Math.round(((bezugsMenge * (z.zusatz_prozent / 100)) / 1000) * 10000) / 10000;
      }
      return +Math.round(((totalGewicht * (z.zusatz_prozent / 100)) / 1000) * 10000) / 10000;
    }

    if (z.menge_kg <= 0) return 0;
    if (istProduktspezifisch(z)) {
      const zugeordnetesGewicht = z.fuer_produkte.reduce((s, pn) => s + (produktGewichte[pn] || 0), 0);
      if (zugeordnetesGewicht === 0) return 0;
    }
    return +Math.round(z.menge_kg * faktor * 10000) / 10000;
  });

  // Rundungskorrektur (max 5% der groessten Zutat)
  if (basisTeig > 0) {
    const summeNormal = scaled.reduce(
      (a, b, i) => a + (istReineProzentZutat(r.zutaten[i]) || istProPresseZutat(r.zutaten[i]) ? 0 : b),
      0
    );
    const zielKg = basisTeigBedarf / 1000;
    const diff = +(zielKg - summeNormal).toFixed(4);
    if (Math.abs(diff) >= 0.01) {
      let maxIdx = 0;
      let maxVal = 0;
      scaled.forEach((v, i) => {
        if (v > maxVal && !istReineProzentZutat(r.zutaten[i]) && !istProPresseZutat(r.zutaten[i])) {
          maxVal = v;
          maxIdx = i;
        }
      });
      const maxKorrektur = maxVal * 0.05;
      const begrenzteDiff = Math.max(-maxKorrektur, Math.min(maxKorrektur, diff));
      if (maxVal > 0 && Math.abs(begrenzteDiff) >= 0.001) scaled[maxIdx] = +(scaled[maxIdx] + begrenzteDiff).toFixed(4);
    }
  }
  return scaled;
};

// Schluesselzahl-Anzeige im Multi-Produkt-Modus (calcBaker Z. 2816-2822)
export const multiSchluesselzahl = (r, produktStueckMap) => {
  const produktGewichte = {};
  let totalBenoetigt = 0;
  r.produkte.forEach((p) => {
    const eingabe = produktStueckMap[p.name] || 0;
    const gewichtG = p.gewicht_g || 0;
    const anzahlStueck = p.stueck_pro_presse > 0 ? eingabe * p.stueck_pro_presse : eingabe;
    const gew = anzahlStueck * gewichtG;
    produktGewichte[p.name] = gew;
    totalBenoetigt += gew;
  });
  if (totalBenoetigt <= 0) return 0;
  const cleanZutaten = r.zutaten.filter((z) => z.name.toLowerCase() !== 'gesamt' && z.menge_kg > 0);
  const verwendete = cleanZutaten.filter(
    (z) => !z.fuer_produkte || !z.fuer_produkte.length || z.fuer_produkte.some((pn) => (produktGewichte[pn] || 0) > 0)
  );
  const multiBasis = verwendete.reduce((s, z) => s + z.menge_kg, 0) * 1000;
  return multiBasis > 0 ? totalBenoetigt / multiBasis : 0;
};
