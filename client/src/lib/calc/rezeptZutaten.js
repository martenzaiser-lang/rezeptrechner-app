import { berechneNaehrwerte, findNaehrwerte, getRezeptAllergene, getRezeptAllergenStatus, getRezeptSpuren, getRezeptLmivZutaten, getRezeptZutatenStatus } from './naehrwerteLookup.js';
import { NAEHRWERT_FELDER } from './naehrwertFelder.js';
import { skaliereMitBezug } from './prozentSkalierung.js';
import { produktionsRezept } from './produktion.js';
import { taBilanz } from './ta.js';

// Explizite betriebliche Zuordnung, bestätigt am 17.07.2026 und dokumentiert
// in server/scripts/berechne-rezept-zutaten.js. Keine unscharfe Namenssuche.
export const REZEPT_ZUTAT_QUELLEN = { brotmischung: 'Brotmischung', mischung: 'Brotmischung', urstückteig: 'Urstück', streusel: 'Streusel' };
const QUELLEN = REZEPT_ZUTAT_QUELLEN;
const norm = n => String(n || '').trim().toLowerCase();
const text = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Laufend aus aktuellen Rohrezepten ableiten, ohne gespeicherte Angaben zu
// verändern. Bei fehlenden Quellen niemals auf veraltete Seed-Werte fallen.
export function rezeptZutaten(recipes, customIngredients = []) {
  const result = new Map(customIngredients.map(c => [norm(c.name), c]));
  const fertig = new Map();
  const inArbeit = new Set();
  const benoetigt = new Set(recipes.flatMap(r => (r.zutaten || []).map(z => norm(z.name))));
  for (const c of customIngredients) benoetigt.add(norm(c.name));

  function berechne(alias) {
    const quelle = QUELLEN[alias];
    if (fertig.has(quelle)) return fertig.get(quelle);
    if (inArbeit.has(quelle)) throw new Error(`Zirkuläre Rezeptverknüpfung: ${quelle}`);
    const kandidaten = recipes.filter(r => norm(r.name) === norm(quelle));
    const r = kandidaten[0];
    inArbeit.add(quelle);
    let data;
    try {
      if (kandidaten.length !== 1) throw new Error(`Quellrezept ${quelle} fehlt oder ist mehrfach vorhanden`);
      if (r.zutaten.some(z => z.fuer_produkte?.length || z.menge_pro_presse > 0)) throw new Error(`Quellrezept ${quelle}: produktabhängige Mengen zuerst zuordnen`);
      for (const z of r.zutaten) {
        const key = norm(z.name);
        if (QUELLEN[key]) result.set(key, { name: z.name, data: berechne(key) });
      }
      const zutaten = [...result.values()];
      const aufgeloest = aufgeloesteRezepte([r], zutaten)[0];
      const sk = skaliereMitBezug(aufgeloest, { faktor: 1 });
      const roh = produktionsRezept(aufgeloest, sk);
      const bilanz = taBilanz(roh);
      const gesamt = sk.reduce((sum, kg) => sum + kg, 0);
      const nw = berechneNaehrwerte(roh, zutaten);
      const allergene = getRezeptAllergene(roh, zutaten);
      const status = getRezeptAllergenStatus(roh, zutaten);
      const lmiv = getRezeptLmivZutaten(roh, zutaten);
      const quellen = roh.zutaten.filter(z => !z.ist_kommentar && z.menge_kg > 0).map(z => findNaehrwerte(z.name, zutaten));
      const referenzen = [...new Set(quellen.map(q => q?.referenz_artikel).filter(Boolean))];
      const hinweise = [...new Set([r.naehrwert_hinweis, ...quellen.map(q => q?.naehrwert_hinweis)].filter(Boolean))];
      data = {
        ta_pro_kg: gesamt > 0 && !bilanz.fehler.length ? { mehl_kg: bilanz.mehl / gesamt, fluessigkeit_kg: bilanz.fluessigkeit / gesamt } : null,
        ta_fehler: bilanz.fehler.join('; '), ta_hinweise: bilanz.hinweise,
        ...Object.fromEntries(NAEHRWERT_FELDER.map(k => [k, nw && !nw.fehlend.length ? nw[k] : null])),
        allergene, a: allergene, allergene_geprueft: status.vollstaendig,
        zutaten_geprueft: getRezeptZutatenStatus(roh, zutaten).vollstaendig,
        spuren: getRezeptSpuren(roh, zutaten).filter(a => !allergene.includes(a)),
        datenstatus: nw && !nw.fehlend.length ? 'rezeptberechnung' : 'ungeprueft',
        bezeichnung: quelle,
        zutaten_lmiv: lmiv.map(z => text(z.name) + (z.lmiv ? ` (${z.lmiv})` : '')).join('; '),
        quelle: `Aktuelles Rezept „${quelle}“, ungebackene Mischung; ohne Backverlust.`,
        referenz_artikel: referenzen.length ? referenzen.join('; ') : undefined,
        naehrwert_hinweis: hinweise.length ? hinweise.join(' · ') : undefined,
        datenhinweise: nw?.fehlend.length ? { zutaten: nw.fehlend.join(', ') } : undefined,
      };
    } catch (err) {
      data = { datenstatus: 'ungeprueft', allergene_geprueft: false, quelle: err.message };
    } finally { inArbeit.delete(quelle); }
    data.rezept_id = r?.id;
    data.rezept_name = quelle;
    fertig.set(quelle, data);
    return data;
  }
  for (const alias of Object.keys(QUELLEN)) {
    if (benoetigt.has(alias)) result.set(alias, { name: result.get(alias)?.name || alias, data: berechne(alias) });
  }
  return [...result.values()];
}

// Nur Rechenkopien anreichern. Editor, Cache und Sicherung behalten Rohdaten.
export function aufgeloesteRezepte(recipes, zutatenDaten) {
  const map = new Map(zutatenDaten.map(c => [norm(c.name), c.data || c]));
  return recipes.map(r => ({ ...r, zutaten: r.zutaten.map(z => {
    const d = QUELLEN[norm(z.name)] && map.get(norm(z.name));
    if (!d || z.ta_anteile || z.ta_pro_kg || z.vorstufe_nur_mehl_wasser) return z;
    if (!d.ta_pro_kg) return { ...z, ta_fehler: d.ta_fehler || 'Mehl-/Flüssigkeitsanteile des Quellrezepts fehlen' };
    return { ...z, ta_pro_kg: d.ta_pro_kg, ta_hinweise: d.ta_hinweise };
  }) }));
}
