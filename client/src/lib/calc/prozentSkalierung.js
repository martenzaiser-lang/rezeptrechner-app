import { istGewicht, taBilanz } from './ta.js';

// Alle Rezeptprozente beziehen sich auf GESAMTMEHL = 100 %.
// kg-Angaben haben Vorrang. Zusammengesetzte Vorstufen werden in der
// Mehlbilanz zerlegt. Das Zielgewicht umfasst Wasser und sämtliche Zutaten.
export function skaliereMitBezug(r, { zielKg, faktor, pressen = 0, produktName } = {}) {
  const aktiv = z => istGewicht(z) && (!produktName || !z.fuer_produkte?.length || z.fuer_produkte.includes(produktName));
  const basis = r.zutaten.map(z => aktiv(z) && !(z.menge_pro_presse > 0) && z.menge_kg > 0 ? z.menge_kg : 0);
  const prozent = r.zutaten.map((z,i) => aktiv(z) && !basis[i] && !(z.menge_pro_presse > 0) ? (z.zusatz_prozent || 0) / 100 : 0);
  const festePressen = r.zutaten.map(z => aktiv(z) && z.menge_pro_presse > 0 ? z.menge_pro_presse * pressen : 0);
  const b = taBilanz(r, basis);
  let mehlBasis = b.mehl;
  let fixesMehl = 0;
  if (prozent.some(p => p > 0)) {
    if (b.fehler.length) throw new Error('Bäckerprozente benötigen bekannte Mehlanteile aller Vorstufen.');
    // Prozentual eingegebenes Mehl gehört selbst zur 100-%-Basis. Bei einem
    // reinen Prozentrezept (Mehlanteile zusammen 100 %) ist die Bezugscharge 1 kg Mehl.
    const pBilanz = taBilanz(r, prozent);
    if (pBilanz.fehler.length) throw new Error('Mehlanteile prozentualer Vorstufen fehlen.');
    const pMehl = pBilanz.mehl;
    const fBilanz = taBilanz(r, festePressen);
    if (fBilanz.fehler.length) throw new Error('Mehlanteile der Pressenzutaten fehlen.');
    if (pMehl < 1 && (mehlBasis > 0 || fBilanz.mehl > 0)) { mehlBasis /= 1 - pMehl; fixesMehl = fBilanz.mehl / (1 - pMehl); }
    else if (mehlBasis === 0 && fBilanz.mehl === 0 && Math.abs(pMehl - 1) < 1e-9) mehlBasis = 1;
    else throw new Error('Mehlbasis fehlt oder Mehlprozente sind widersprüchlich. Reine Prozentrezepte benötigen insgesamt 100 % Mehl.');
  }
  const charge = basis.map((v,i) => v + prozent[i] * mehlBasis);
  const fest = festePressen.map((v,i) => v + prozent[i] * fixesMehl);
  const chargeKg = charge.reduce((s,n) => s+n,0);
  const festKg = fest.reduce((s,n) => s+n,0);
  if (chargeKg === 0) {
    if (zielKg != null && Math.abs(zielKg-festKg) > 1e-9) throw new Error('Keine skalierbare Grundmenge für das gewünschte Gewicht vorhanden.');
    return fest;
  }
  // Pressen-Festmengen sind Bestandteil des eingestellten Produktgewichts.
  const f = faktor ?? ((zielKg - festKg) / chargeKg);
  if (!Number.isFinite(f) || f < 0) throw new Error('Pressenzutaten übersteigen das eingestellte Produktgewicht.');
  return charge.map((v,i) => v*f + fest[i]);
}
