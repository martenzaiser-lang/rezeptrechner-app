// Teigausbeute (TA) — 1:1 portiert aus der alten App (index.html Z. 2260-2316).
//
// Formel: TA = (Gesamtmehl + Schüttwasser) / Gesamtmehl × 100
// Regeln:
// - Mehl: ALLES Mehl zaehlt (inkl. Kochstueck, Quellstueck, Vorteig)
// - Wasser: nur FREIES Wasser (Schuettwasser); gebundenes Wasser in
//   Quell-/Koch-/Bruehstueck zaehlt NICHT
// - Sauerteig: wird nach seiner TA aufgeteilt ("... TA 180" im Namen,
//   Default TA 200 = Salzsauerteig: 50% Mehl / 50% Wasser)
// - Fluessigkeiten (Milch, Ei, ...) zaehlen wie Wasser

export const FLUESSIGKEITEN = ['milch', 'buttermilch', 'sahne', 'joghurt', 'kefir', 'ei', 'eier', 'vollei', 'eigelb', 'eiweiß', 'bier', 'saft', 'orangensaft', 'apfelsaft', 'wein'];
export const GEBUNDEN_KEYS = ['quell', 'koch', 'brüh'];

export const isSauerteig = (z) => z.name.toLowerCase().includes('sauerteig');
export const isFluessigkeit = (z) => z.ist_wasser || FLUESSIGKEITEN.some((f) => z.name.toLowerCase().includes(f));
export const istGebunden = (z) => Boolean(z.bemerkung && GEBUNDEN_KEYS.some((k) => z.bemerkung.toLowerCase().includes(k)));

// Sauerteig-TA aus Name extrahieren: "Roggensauerteig TA 180" → 180
export const getSauerteigTA = (z) => {
  const match = z.name.match(/ta\s*(\d+)/i);
  return match ? parseInt(match[1]) : 200;
};

export const mehlkg = (r) => {
  let m = r.zutaten.filter((z) => z.ist_mehl).reduce((s, z) => s + z.menge_kg, 0);
  r.zutaten.filter((z) => isSauerteig(z)).forEach((z) => {
    const taVal = getSauerteigTA(z);
    m += z.menge_kg * (100 / taVal);
  });
  return m;
};

export const wasserkg = (r) => {
  let w = r.zutaten.filter((z) => z.ist_wasser && !istGebunden(z)).reduce((s, z) => s + z.menge_kg, 0);
  r.zutaten
    .filter((z) => !z.ist_wasser && !z.ist_mehl && isFluessigkeit(z) && !istGebunden(z))
    .forEach((z) => { w += z.menge_kg; });
  r.zutaten.filter((z) => isSauerteig(z) && !istGebunden(z)).forEach((z) => {
    const taVal = getSauerteigTA(z);
    w += z.menge_kg * ((taVal - 100) / taVal);
  });
  return w;
};

export const gesamt = (r) => r.zutaten.reduce((s, z) => s + z.menge_kg, 0);

export const ta = (r) => {
  const m = mehlkg(r);
  const w = wasserkg(r);
  return m > 0 ? +(((m + w) / m) * 100).toFixed(1) : 0;
};

// Baeckerprozent einer Zutat (bezogen auf Gesamtmehl)
export const bp = (r, z) => {
  const m = mehlkg(r);
  return m > 0 ? +((z.menge_kg / m) * 100).toFixed(1) : 0;
};

// Rohteiggewicht aus Fertiggewicht + Backverlust
export const rohgew = (r) => {
  const fg = r.stueckgewicht_g || 500;
  const bv = r.backverlust_pct || 10;
  return Math.round((fg * 100) / (100 - bv));
};
