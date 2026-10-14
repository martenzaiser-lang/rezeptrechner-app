import { produktRezept } from './calc/produktion.js';
import { taBilanz } from './calc/ta.js';
import { berechneRohstoffkosten } from './preise.js';
import { kalkuliereVk } from './kalkulation.js';

export const produktSchluessel = (r, name) => JSON.stringify([r.id, name]);
export const preisZahl = v => String(v ?? '').trim() === '' ? null : /^\d+(?:[.,]\d+)?$/.test(String(v).trim()) ? Number(String(v).replace(',', '.')) : NaN;
export function sortimentsKalkulation(recipes, prices, parameter, entwurf = {}, rundung = .05) {
  if (![.01, .05, .1].includes(rundung)) rundung = .05;
  return recipes.filter(r => r.aktiv !== false).flatMap(r => (r.produkte?.length ? r.produkte.map(p => p.name) : [r.name]).map(name => {
    const key = produktSchluessel(r, name), d = entwurf[key] || {}, produkt = produktRezept(r, name);
    const kosten = berechneRohstoffkosten(produkt, prices);
    const portionen = kosten.istBlech ? preisZahl(d.portionen) : null;
    const teile = portionen > 0 && Number.isInteger(portionen) ? portionen : 1;
    const fehler = [...kosten.ohnePreis];
    if (kosten.istBlech && portionen != null && !(portionen > 0 && Number.isInteger(portionen))) fehler.push('Stücke pro Blech müssen eine ganze Zahl größer 0 sein');
    if (!kosten.zeilen.length) fehler.push('Keine berechenbare Zutatenmenge');
    const k = fehler.length ? null : kalkuliereVk(kosten.summe / teile, parameter);
    if (!k && !fehler.length) fehler.push('Rohstoffkosten oder Zielquoten prüfen');
    const vorgeschlagen = k ? Math.round(Math.ceil(k.brutto / rundung - 1e-9) * rundung * 100) / 100 : null;
    const alt = preisZahl(d.alterPreis), neuEingabe = preisZahl(d.neuerPreis);
    const neu = neuEingabe == null ? vorgeschlagen : neuEingabe;
    if (alt != null && !(alt >= 0 && Number.isFinite(alt))) fehler.push('Bisherigen Preis prüfen');
    if (neuEingabe != null && !(neuEingabe > 0 && Number.isFinite(neuEingabe))) fehler.push('Neuen Preis prüfen');
    const referenzen = [...new Set(kosten.zeilen.flatMap(z => z.quelle === 'bäko' ? [z.name] : z.referenzen || []))];
    return { key, rezeptId: r.id, name, kategorie: r.kategorie, istBlech: kosten.istBlech,
      bezug: kosten.istBlech ? teile > 1 || portionen === 1 ? `Stück (1/${teile} Blech)` : `Blech ${r.blech_breite_cm || 50} × ${r.blech_laenge_cm || 80} cm` : `Stück (${produkt.stueckgewicht_g || 1000} g Teig)`,
      rohstoffe: kosten.summe / teile, vorgeschlagen, neu, alt, differenz: Number.isFinite(neu) && alt > 0 ? (neu / alt - 1) * 100 : null,
      fehler: [...new Set(fehler)], referenzen, hinweise: [...new Set([...taBilanz(produkt).hinweise, ...kosten.zeilen.flatMap(z => z.preis_hinweise || [])])],
      unterZiel: Number.isFinite(neu) && k && neu + 1e-9 < k.brutto,
    };
  }));
}

// Excel-kompatible CSV, einschließlich Schutz vor Formeln aus Produktnamen.
export function sortimentsCSV(rows) {
  const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
  const num = v => Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '';
  const data = [['Produkt', 'Kategorie', 'Bezug', 'Rohstoffe netto EUR', 'Bisher brutto EUR', 'Vorschlag brutto EUR', 'Entwurf brutto EUR', 'Änderung %', 'Prüfhinweise']];
  for (const r of rows) data.push([r.name, r.kategorie, r.bezug, num(r.rohstoffe), num(r.alt), r.fehler.length ? '' : num(r.vorgeschlagen), r.fehler.length ? '' : num(r.neu), r.fehler.length ? '' : num(r.differenz), [...r.fehler, ...(r.unterZiel ? ['Preis unter Kalkulationsziel'] : []), ...r.referenzen.map(n => `${n}: BÄKO-Referenzpreis`), ...r.hinweise].join('; ')]);
  return '\uFEFF' + data.map(row => row.map(cell).join(';')).join('\r\n');
}
