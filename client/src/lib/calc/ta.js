// Fachbilanz über die gesamte Rezeptur, einschließlich aller Vorstufen.
// ta_anteile beschreibt die Komponenten der angegebenen Grundmenge menge_kg.
// Fertige Vorstufen dürfen nur einmal vorkommen: entweder Komponenten ODER
// zusammengesetzte Zutat mit ta_anteile. Keine automatische TA-200-Annahme.
import { istGekochterRoggen } from '../../data/betrieblicheVorstufen.js';
const name = z => String(z?.name || '').trim().toLowerCase();
export const istGewicht = z => !z.ist_kommentar && name(z) !== 'gesamt';
const istPaniermehl = z => /^(paniermehl|semmelbrösel|semmelmehl|brotbrösel)(\s*\/\s*(paniermehl|semmelbrösel|semmelmehl|brotbrösel))*$/.test(name(z));
export const istKeinTaMehl = z => !istPaniermehl(z) && /altbrot|ausschussbrot|restbrot|paniermehl|semmelbrösel|brotbrösel|sonnenblumenkern|kürbiskern|leinsaat|leinsamen|sesam|mandel|kokosmehl|nuss|nüsse|mohn|chia|saaten/.test(name(z));
export const FLUESSIGKEITEN = ['wasser', 'milch', 'vollmilch', 'buttermilch', 'sahne', 'joghurt', 'kefir', 'ei', 'eier', 'vollei', 'eigelb', 'eiweiß', 'bier', 'saft', 'orangensaft', 'apfelsaft', 'wein', 'rum'];
export const GEBUNDEN_KEYS = ['quell', 'koch', 'brüh'];
export const isSauerteig = z => name(z).includes('sauerteig');
export const istGebunden = z => istGekochterRoggen(z.name) || GEBUNDEN_KEYS.some(k => String(z.bemerkung || '').toLowerCase().includes(k));
export const isFluessigkeit = z => z.ta_rolle ? z.ta_rolle === 'fluessigkeit' : !/pulver|granulat|eiszeit/.test(name(z)) && (z.ist_wasser === true || FLUESSIGKEITEN.includes(name(z)));
const istVorstufe = z => istGekochterRoggen(z.name) || /sauerteig|vorteig|poolish|biga|kochstück|brühstück|quellstück|hefestück/.test(name(z)) || ['brotmischung', 'mischung', 'urstückteig', 'streusel'].includes(name(z));
const kg = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;

export function rezeptart(r) {
  if (['masse', 'teig', 'mischung', 'unbekannt'].includes(r.rezeptart)) return r.rezeptart;
  if (/rührmasse|rührteig|biskuit|wiener\s*masse|brandmasse|brandteig|mürb(e|eteig)|sand(torten)?masse/.test(name(r))) return 'masse';
  // Kuchen kann einen Hefeteig enthalten. Deshalb keine Gleichsetzung mit Masse.
  return ['Brot', 'Brötchen', 'Feingebäck', 'Plunder', 'Berliner / Krapfen'].includes(r.kategorie) ? 'teig' : 'unbekannt';
}

export function getSauerteigTA(z) {
  const match = name(z).match(/\bta\s*(\d+(?:[.,]\d+)?)/);
  const value = z.vorstufe_ta ?? (match ? Number(match[1].replace(',', '.')) : null);
  return typeof value === 'number' && Number.isFinite(value) && value >= 100 ? value : null;
}

export function taBilanz(r, sk) {
  let mehl = 0, fluessigkeit = 0, gebunden = 0;
  const fehler = [];
  const hinweise = [];
  for (const [i, z] of (r.zutaten || []).entries()) {
    if (!istGewicht(z)) continue;
    const menge = sk ? sk[i] : z.menge_kg;
    if (!kg(menge)) { fehler.push(`${z.name}: ungültige Menge`); continue; }
    if (menge === 0) {
      if (!sk && (z.zusatz_prozent > 0 || z.menge_pro_presse > 0)) fehler.push(`${z.name}: erst Produktionsmenge berechnen`);
      continue;
    }
    if (z.ta_naeherung) hinweise.push(`${z.name}: ${z.ta_hinweis || (z.ta_pro_kg ? 'Mehl-/Flüssigkeitsanteile geschätzt' : 'unbekannte Mehlanteile kleiner Backmittelzugaben nicht eingerechnet')}`);
    if (z.ta_hinweise?.length) hinweise.push(...z.ta_hinweise);
    if (z.ta_fehler) { fehler.push(`${z.name}: ${z.ta_fehler}`); continue; }
    let m = 0, w = 0;
    if (z.ta_pro_kg) {
      const a = z.ta_pro_kg;
      if (!kg(a.mehl_kg) || !kg(a.fluessigkeit_kg) || a.mehl_kg + a.fluessigkeit_kg > 1 + 1e-9) {
        fehler.push(`${z.name}: unplausible Vorstufenanteile pro kg`); continue;
      }
      m = menge * a.mehl_kg; w = menge * a.fluessigkeit_kg;
    } else if (z.ta_anteile) {
      const a = z.ta_anteile;
      if (!kg(a.mehl_kg) || !kg(a.fluessigkeit_kg) || !kg(z.menge_kg) || z.menge_kg <= 0 || a.mehl_kg + a.fluessigkeit_kg > z.menge_kg + 1e-9) {
        fehler.push(`${z.name}: unplausible Vorstufenanteile`); continue;
      }
      const f = menge / z.menge_kg;
      m = a.mehl_kg * f; w = a.fluessigkeit_kg * f;
    } else if (istPaniermehl(z)) {
      // Betriebliche Festlegung: Paniermehl zählt wie Mehl (Marten, 15.10.2026).
      // Gilt auch für Altbestände ohne Mehlflag bzw. mit Rolle „sonstiges“.
      m = menge;
    } else if (z.ta_rolle === 'sonstiges') {
      // Explizit als weder Mehl noch Flüssigkeit gepflegt.
    } else if (istVorstufe(z) || z.ta_rolle === 'vorstufe') {
      const t = getSauerteigTA(z);
      if (z.vorstufe_nur_mehl_wasser !== true || t == null) {
        fehler.push(`${z.name}: Mehl-/Flüssigkeitsanteile fehlen`); continue;
      }
      m = menge * 100 / t; w = menge - m;
    } else if (istKeinTaMehl(z)) {
      // Eigengewicht von Saaten und Altbrot gehört nicht zur Mehlbasis.
    } else if ((z.ist_mehl || z.ta_rolle === 'mehl') && (FLUESSIGKEITEN.includes(name(z)) || /^(classic[- ]baguette|gluten|weizengluten|kleber)$/.test(name(z)))) {
      fehler.push(`${z.name}: keine reine Mehlzutat; TA-Zuordnung bzw. Mehlanteile prüfen`); continue;
    } else if (z.ist_mehl && z.ist_wasser) {
      fehler.push(`${z.name}: widersprüchliche Mehl-/Wasserkennzeichnung`); continue;
    } else if (z.ta_rolle === 'mehl' || (z.ist_mehl && !z.ta_rolle)) m = menge;
    else if (isFluessigkeit(z)) w = menge;
    mehl += m; fluessigkeit += w;
    if (istGebunden(z) || /kochstück|quellstück|brühstück/.test(name(z))) gebunden += w;
  }
  return { mehl, fluessigkeit, gebunden, fehler, hinweise: [...new Set(hinweise)] };
}

export function taErgebnis(r, sk) {
  const art = rezeptart(r);
  if (art === 'masse') return { status: 'ignoriert', kategorie: 'Masse', ta: null };
  if (art === 'mischung') return { status: 'ignoriert', kategorie: 'Trockenmischung', ta: null };
  if (art === 'unbekannt') return { status: 'unvollständig', ta: null, fehler: ['Rezeptart prüfen'] };
  const b = taBilanz(r, sk);
  if (b.fehler.length || b.mehl <= 0) return { ...b, status: 'unvollständig', ta: null };
  return { ...b, status: b.hinweise.length ? 'näherung' : 'korrekt', ta: +((b.mehl + b.fluessigkeit) / b.mehl * 100).toFixed(1) };
}
export const ta = (r, sk) => taErgebnis(r, sk).ta;
export const taLabel = (r, sk) => {
  const b = taErgebnis(r, sk);
  return b.status === 'ignoriert' ? '' : b.ta == null ? 'TA nicht bestimmbar' : `TA ${b.hinweise?.length ? '≈ ' : ''}${b.ta.toLocaleString('de-DE')}`;
};
export const mehlkg = r => { const b = taBilanz(r); return b.fehler.length ? null : b.mehl; };
export const wasserkg = r => { const b = taBilanz(r); return b.fehler.length ? null : b.fluessigkeit; };
export const gesamt = r => r.zutaten.filter(istGewicht).reduce((s,z) => s + (kg(z.menge_kg) ? z.menge_kg : 0), 0);
// Bäckerprozente gelten auch für Massen; die TA wird hier NICHT aufgerufen.
export const bp = (r,z) => { const m = mehlkg(r); return m > 0 && istGewicht(z) ? +(z.menge_kg / m * 100).toFixed(1) : null; };
export const rohgew = r => {
  // stueckgewicht_g ist bereits die Teigeinlage, kein Verkaufsgewicht.
  // Einen Backverlust hier herauszurechnen würde den Ansatz doppelt erhöhen.
  return kg(r.stueckgewicht_g) && r.stueckgewicht_g > 0 ? r.stueckgewicht_g : null;
};

// Physisch nach dem Abkühlen wiegen: Soll - Ist ist das nachzufüllende Wasser.
// Nur die Sollmenge in der Rezeptbilanz führen: Ausgleich NICHT doppelt addieren.
// Funktion allein ersetzt noch keine Waage-/Eingabe-/Chargen-Dokumentation.
export function kochstueckAusgleich(sollKg, abgekuehltKg) {
  if (!kg(sollKg) || !kg(abgekuehltKg)) return { status: 'unvollständig', wasserNachfuellenKg: null };
  if (abgekuehltKg > sollKg) return { status: 'prüfen', wasserNachfuellenKg: null };
  return { status: 'korrekt', wasserNachfuellenKg: sollKg - abgekuehltKg };
}
