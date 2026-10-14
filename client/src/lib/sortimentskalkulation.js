import { produktRezept } from './calc/produktion.js';
import { taBilanz } from './calc/ta.js';
import { berechneRohstoffkosten } from './preise.js';
import { kalkuliereVk } from './kalkulation.js';
import { istVerkaufsrezept } from './verkaufsrezept.js';

export const produktSchluessel = (r, name) => JSON.stringify([r.id, name]);
export const preisZahl = v => String(v ?? '').trim() === '' ? null : /^\d+(?:[.,]\d+)?$/.test(String(v).trim()) ? Number(String(v).replace(',', '.')) : NaN;
const positiv = n => Number.isFinite(n) && n > 0;
const belegt = n => n != null && String(n).trim() !== '';

// Nur die Verkaufseinheit binden, nicht Rezeptversion oder Einkaufspreise.
export function preisBasis(r, name, portionen) {
  const p = r.produkte?.find(p => p.name === name);
  return JSON.stringify(r.berechnung === 'blech'
    ? ['blech', r.blech_breite_cm, r.blech_laenge_cm, preisZahl(portionen)]
    : ['stueck', p?.gewicht_g ?? r.stueckgewicht_g]);
}

export function sortimentsKalkulation(recipes, prices, parameter, entwurf = {}, rundung = .05, stundensatz = null) {
  if (![.01, .05, .1].includes(rundung)) rundung = .05;
  return recipes.filter(r => r.aktiv !== false && istVerkaufsrezept(r)).flatMap(r => (r.produkte?.length ? r.produkte.map(p => p.name) : [r.name]).map(name => {
    const key = produktSchluessel(r, name), d = entwurf[key] || {};
    const basis = preisBasis(r, name, d.portionen);
    const basisOffen = ['alterPreis', 'neuerPreis', 'arbeitsminuten'].some(k => belegt(d[k])) && d.basis !== basis;
    const istBlech = r.berechnung === 'blech';
    const gewicht = r.produkte?.find(p => p.name === name)?.gewicht_g ?? r.stueckgewicht_g;
    const bezugsFehler = !istBlech && !positiv(gewicht) ? ['Teiggewicht pro Stück fehlt; in den Stammdaten festlegen.']
      : istBlech && (!positiv(r.blech_breite_cm) || !positiv(r.blech_laenge_cm)) ? ['Blechmaße fehlen; in den Stammdaten festlegen.'] : [];
    const produkt = bezugsFehler.length ? null : produktRezept(r, name);
    const kosten = produkt ? berechneRohstoffkosten(produkt, prices) : { summe: null, zeilen: [], ohnePreis: [], istBlech };
    const portionen = istBlech ? preisZahl(d.portionen) : null;
    const teile = positiv(portionen) && Number.isInteger(portionen) ? portionen : 1;
    const fehler = [...bezugsFehler, ...kosten.ohnePreis];
    if (istBlech && portionen != null && !(positiv(portionen) && Number.isInteger(portionen))) fehler.push('Stücke pro Blech müssen eine ganze Zahl größer 0 sein');
    if (!bezugsFehler.length && !kosten.zeilen.length) fehler.push('Keine berechenbare Zutatenmenge');
    if (basisOffen) fehler.push(d.basis ? 'Verkaufseinheit geändert: gespeicherte Preise und Arbeitszeit prüfen.' : 'Gespeicherte Preise haben noch keinen bestätigten Gewichtsbezug.');
    const minuten = preisZahl(d.arbeitsminuten);
    if (minuten != null && !positiv(minuten)) fehler.push('Arbeitszeit muss positiv sein oder leer bleiben.');
    if (minuten != null && !positiv(stundensatz)) fehler.push('Für Arbeitszeiten zuerst Personalkosten in €/Stunde eintragen.');
    const personalkosten = minuten == null ? null : minuten / 60 * stundensatz;
    const k = fehler.length ? null : kalkuliereVk(kosten.summe / teile, parameter, { personalkosten });
    if (!k && !fehler.length) fehler.push('Rohstoffkosten oder Zielquoten prüfen');
    const vorgeschlagen = k ? Math.round(Math.ceil(k.brutto / rundung - 1e-9) * rundung * 100) / 100 : null;
    const alt = basisOffen ? null : preisZahl(d.alterPreis), neu = basisOffen ? null : preisZahl(d.neuerPreis);
    if (alt != null && !(alt >= 0 && Number.isFinite(alt))) fehler.push('Bisherigen Preis prüfen');
    if (neu != null && !positiv(neu)) fehler.push('Neuen Preis prüfen');
    const referenzen = [...new Set(kosten.zeilen.flatMap(z => z.quelle === 'bäko' ? [z.name] : z.referenzen || []))];
    const hinweise = [...(produkt ? taBilanz(produkt).hinweise : []), ...kosten.zeilen.flatMap(z => z.preis_hinweise || [])];
    if (minuten == null) hinweise.push('Modellpreis mit pauschaler Personalquote; tatsächliche Arbeitszeit nicht erfasst.');
    return { key, rezeptId: r.id, name, kategorie: r.kategorie, istBlech, basis, basisOffen,
      kostenOffen: bezugsFehler.length > 0 || kosten.ohnePreis.length > 0 || !kosten.zeilen.length,
      bezug: istBlech ? teile > 1 || portionen === 1 ? `Stück (1/${teile} Blech, ${r.blech_breite_cm} × ${r.blech_laenge_cm} cm)` : positiv(r.blech_breite_cm) && positiv(r.blech_laenge_cm) ? `Blech ${r.blech_breite_cm} × ${r.blech_laenge_cm} cm` : 'Blech – Maße fehlen'
        : positiv(gewicht) ? `Stück (${gewicht} g Teig)` : 'Stück – Teiggewicht fehlt',
      rohstoffe: kosten.summe == null ? null : kosten.summe / teile, vorgeschlagen, neu, alt,
      personalkosten, minuten, rechnung: k, modell: minuten == null ? 'Personalquote' : 'Arbeitszeit',
      differenz: Number.isFinite(neu) && alt > 0 ? (neu / alt - 1) * 100 : null,
      fehler: [...new Set(fehler)], referenzen, hinweise: [...new Set(hinweise)],
      unterZiel: Number.isFinite(neu) && !!k && neu + 1e-9 < k.brutto,
    };
  }));
}

// Excel-kompatible CSV, einschließlich Schutz vor Formeln aus Produktnamen.
export function sortimentsCSV(rows) {
  const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
  const num = v => Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '';
  const data = [['Produkt', 'Kategorie', 'Bezug', 'Rohstoffe netto EUR', 'Bisher brutto EUR', 'Vorschlag brutto EUR', 'Entwurf brutto EUR', 'Änderung %', 'Personalberechnung', 'Arbeitsminuten je Einheit', 'Personalkosten netto EUR', 'Prüfhinweise']];
  for (const r of rows) data.push([r.name, r.kategorie, r.bezug, num(r.rohstoffe), num(r.alt), r.fehler.length ? '' : num(r.vorgeschlagen), r.fehler.length ? '' : num(r.neu), r.fehler.length ? '' : num(r.differenz), r.modell, num(r.minuten), num(r.personalkosten), [...r.fehler, ...(r.unterZiel ? ['Preis unter Kalkulationsziel'] : []), ...r.referenzen.map(n => `${n}: BÄKO-Referenzpreis`), ...r.hinweise].join('; ')]);
  return '\uFEFF' + data.map(row => row.map(cell).join(';')).join('\r\n');
}
