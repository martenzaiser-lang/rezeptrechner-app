import { istGewicht, taBilanz } from './ta.js';

// Bäckerprozente beziehen sich auf GESAMTMEHL = 100 %.
// Rezeptzugaben können ausdrücklich auf Basisteig oder Produktgewicht bezogen sein.
// kg-Angaben haben Vorrang. Zusammengesetzte Vorstufen werden in der
// Mehlbilanz zerlegt. Das Zielgewicht umfasst Wasser und sämtliche Zutaten.
export function skaliereMitBezug(r, { zielKg, faktor, pressen = 0, produktName } = {}) {
  const aktiv = z => istGewicht(z) && (!produktName || !z.fuer_produkte?.length || z.fuer_produkte.includes(produktName));
  const basis = r.zutaten.map(z => aktiv(z) && !(z.menge_pro_presse > 0) && z.menge_kg > 0 ? z.menge_kg : 0);
  const prozent = r.zutaten.map((z,i) => aktiv(z) && !basis[i] && !(z.menge_pro_presse > 0) ? (z.zusatz_prozent || 0) / 100 : 0);
  const festePressen = r.zutaten.map(z => aktiv(z) && z.menge_pro_presse > 0 ? z.menge_pro_presse * pressen : 0);
  if (prozent.some((p,i) => p > 0 && r.zutaten[i].prozent_bezug && r.zutaten[i].prozent_bezug !== 'mehl')) {
    return skaliereGemischteBezuege(r, basis, prozent, festePressen, { zielKg, faktor });
  }
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

function skaliereGemischteBezuege(r, basis, prozent, fest, { zielKg, faktor }) {
  const sum = xs => xs.reduce((s,n) => s+n,0);
  const anteil = bezug => prozent.map((p,i) => (r.zutaten[i].prozent_bezug || 'mehl') === bezug ? p : 0);
  const pm = anteil('mehl'), pb = anteil('basisteig'), pe = anteil('endprodukt');
  if (prozent.some((p,i) => p > 0 && !['mehl','basisteig','endprodukt'].includes(r.zutaten[i].prozent_bezug || 'mehl'))) {
    throw new Error('Prozentbezug prüfen: Mehl, Basisteig oder Produktgewicht auswählen.');
  }
  const endAnteil = sum(pe);
  if (endAnteil >= 1) throw new Error('Zugaben vom Produktgewicht müssen zusammen unter 100 % liegen.');
  const basisKg = sum(basis);
  // Basisteig = die festen Grundrezeptmengen vor Prozentzugaben.
  const charge = basis.map((v,i) => v + pb[i] * basisKg);
  const mehl = (mengen, erforderlich) => {
    const b = taBilanz(r,mengen);
    if (erforderlich && b.fehler.length) throw new Error('Bäckerprozente benötigen bekannte Mehlanteile aller Vorstufen.');
    return b.mehl;
  };
  const brauchtMehl = pm.some(p => p > 0);
  if (!brauchtMehl) {
    const chargeKg = sum(charge) / (1-endAnteil), festKg = sum(fest) / (1-endAnteil);
    const f = faktor ?? (chargeKg > 0 ? (zielKg-festKg)/chargeKg : 0);
    if (!Number.isFinite(f) || f < 0 || (!chargeKg && zielKg != null && Math.abs(zielKg-festKg)>1e-9)) throw new Error('Grundmenge oder Produktgewicht prüfen.');
    const gesamtKg = chargeKg*f + festKg;
    return charge.map((v,i) => v*f + fest[i] + pe[i]*gesamtKg);
  }
  // M = Mehl, T = Gesamtgewicht. Mehlzugaben können selbst Mehl enthalten,
  // ebenso die auf T bezogenen Zutaten. Beide Gleichungen gemeinsam lösen.
  const mBasis = mehl(charge,true), mFest = mehl(fest,true);
  const mPm = mehl(pm,true), mPe = mehl(pe,true);
  const pMehl = sum(pm), a = 1-mPm, d = 1-endAnteil;
  if (basisKg === 0 && sum(fest) === 0 && Math.abs(mPm-1)<1e-9 && mPe === 0) {
    const kg = pMehl/d;
    const f = faktor ?? zielKg/kg;
    if (!Number.isFinite(f) || f < 0) throw new Error('Produktgewicht prüfen.');
    return pm.map((p,i) => (p+pe[i]*kg)*f);
  }
  const det = a*d - mPe*pMehl;
  if (!(det > 1e-9)) throw new Error('Prozentbezüge ergeben keine eindeutige positive Mehl-/Gewichtsbilanz.');
  const loese = (m,kg) => ({ mehl:(m*d+mPe*kg)/det, kg:(a*kg+pMehl*m)/det });
  const c = loese(mBasis,sum(charge)), festerTeil = loese(mFest,sum(fest));
  const f = faktor ?? (c.kg > 0 ? (zielKg-festerTeil.kg)/c.kg : NaN);
  if (!Number.isFinite(f) || f < 0) throw new Error('Grundmenge oder Produktgewicht prüfen.');
  const gesamtMehl = c.mehl*f + festerTeil.mehl, gesamtKg = c.kg*f + festerTeil.kg;
  if (!(gesamtMehl > 0) && f !== 0) throw new Error('Mehlbasis fehlt.');
  return charge.map((v,i) => v*f + fest[i] + pm[i]*gesamtMehl + pe[i]*gesamtKg);
}
