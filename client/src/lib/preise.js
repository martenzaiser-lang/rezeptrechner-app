// Preis-Lookup + Rezeptkosten — 1:1 aus der alten App (Z. 4297, 5486).
// Eigene Preise (DB) haben Vorrang, BAEKO-Standardpreise sind Fallback.

import { ZUTAT_PREISE } from '../data/baekoPreise.js';
import { skaliere, skaliereBlech, skaliereByFactor } from './calc/skalierung.js';
import { REZEPT_ZUTAT_QUELLEN } from './calc/rezeptZutaten.js';
import { ROGGEN_KOCHSTUECK, istGekochterRoggen } from '../data/betrieblicheVorstufen.js';

const istKostenfreiesWasser = name => /^(wasser|schüttwasser|leitungswasser|trinkwasser)(?:\s*\([^)]*\))?$/i.test(name.trim());
// Betriebsangabe 14.10.2026: 1 kg Mehl + 1 kg Wasser + 20 g Salz.
const SAUERMEHLE = { roggensauerteig: 'Roggenmehl 1370', weizensauerteig: 'Weizenmehl 550' };

// Eigene Mischungen immer mit ihren aktuellen Zutatenpreisen kalkulieren.
// Fehlende Preise in einer Unterrezeptur dürfen nicht durch alte Mixpreise
// verdeckt werden. Gespeicherte Preislisten bleiben unverändert.
export function rezeptPreise(recipes, prices = []) {
  const result = Object.fromEntries(prices.map(p => [p.zutat_name, {
    preis_kg: Number(p.preis_eur_kg),
    preis_hinweise: /richtwert|schätz|\bca\./i.test(p.lieferant || '') ? [`${p.zutat_name}: ${p.lieferant}; aktuellen Einkaufspreis prüfen`] : [],
    ...(/^baguette-backmittel$/i.test(p.zutat_name) && /classic baguette/i.test(p.lieferant || '')
      ? { preis_kg: null, fehler: 'Baguette-Backmittel: Einkaufspreis für IREKS Weizenback 1856 fehlt (alter Artikel: Classic Baguette)' } : {}),
  }]));
  const namen = new Set(recipes.flatMap(r => r.zutaten.filter(z => !z.ist_kommentar).map(z => z.name)));
  const besucht = new Set(), fertig = new Map();
  function aufloesen(name) {
    const key = name.trim().toLowerCase(), sauerMehl = SAUERMEHLE[key], kochRoggen = istGekochterRoggen(name);
    const quelle = REZEPT_ZUTAT_QUELLEN[key] || (sauerMehl ? key : kochRoggen ? 'Gekochte Roggenkörner' : null);
    if (!quelle) return result[name];
    if (fertig.has(quelle)) return result[name] = fertig.get(quelle);
    if (besucht.has(quelle)) throw Error(`Zirkuläre Preiskalkulation: ${quelle}`);
    besucht.add(quelle);
    let wert;
    try {
      const kandidaten = sauerMehl ? [{ name, zutaten: [
        { name: sauerMehl, menge_kg: 1 }, { name: 'Wasser', menge_kg: 1 }, { name: 'Salz', menge_kg: .02 },
      ] }] : kochRoggen ? [{ name, zutaten: [
        { name: 'Roggenkörner', menge_kg: ROGGEN_KOCHSTUECK.trocken_kg },
        { name: 'Wasser', menge_kg: ROGGEN_KOCHSTUECK.wasser_kg },
      ] }] : recipes.filter(r => r.name.toLowerCase() === quelle.toLowerCase());
      if (kandidaten.length !== 1) throw Error(`Quellrezept ${quelle} fehlt oder ist mehrfach vorhanden`);
      const r = kandidaten[0];
      if (r.zutaten.some(z => z.fuer_produkte?.length || z.menge_pro_presse > 0)) throw Error(`${quelle}: produktabhängige Mengen prüfen`);
      const sk = skaliereByFactor(r, 1);
      let kosten = 0, gewicht = 0;
      const referenzen = new Set();
      const preisHinweise = new Set(kochRoggen ? [ROGGEN_KOCHSTUECK.hinweis] : []);
      for (const [i,z] of r.zutaten.entries()) {
        if (z.ist_kommentar || !(sk[i] > 0)) continue;
        const eigen = aufloesen(z.name), wasser = istKostenfreiesWasser(z.name);
        if (eigen?.fehler) throw Error(eigen.fehler);
        const preis = eigen?.preis_kg ?? findZutatPreis(z.name) ?? (wasser ? 0 : null);
        if (preis == null || !Number.isFinite(preis) || preis < 0) throw Error(`${quelle}: Preis für ${z.name} fehlt`);
        for (const n of eigen?.referenzen || []) referenzen.add(n);
        for (const h of eigen?.preis_hinweise || []) preisHinweise.add(h);
        if (eigen?.preis_kg == null && findZutatPreis(z.name) != null) referenzen.add(z.name);
        kosten += sk[i] * preis; gewicht += sk[i];
      }
      if (!(gewicht > 0)) throw Error(`${quelle}: Zutatenmenge fehlt`);
      wert = { preis_kg: kosten / gewicht, quelle: 'rezept', rezept_name: quelle, referenzen: [...referenzen], preis_hinweise: [...preisHinweise] };
    } catch(err) { wert = { preis_kg: null, fehler: err.message }; }
    besucht.delete(quelle); fertig.set(quelle, wert); return result[name] = wert;
  }
  for (const name of namen) aufloesen(name);
  return result;
}

export function findZutatPreis(zutatName) {
  if (!zutatName) return null;
  const name = zutatName.toLowerCase().trim();
  if (ZUTAT_PREISE[name] !== undefined) return ZUTAT_PREISE[name];
  return null;
}

export function fehlendePreise(r, sk, eigenePreise = {}) {
  return r.zutaten.filter((z, i) => !z.ist_kommentar && sk?.[i] > 0 &&
    !istKostenfreiesWasser(z.name) &&
    (eigenePreise[z.name]?.fehler || eigenePreise[z.name]?.preis_kg == null && findZutatPreis(z.name) == null)).map(z => z.name);
}

// eigenePreise: { zutatName: { preis_kg } } (aus DB-prices abgeleitet)
export function calcRezeptKosten(r, sk, eigenePreise = {}) {
  if (!sk || !sk.length) return 0;
  let kosten = 0;
  r.zutaten.forEach((z, idx) => {
    const kg = sk[idx] || 0;
    const p = eigenePreise[z.name];
    if (p?.fehler) return;
    if (p?.preis_kg != null && Number.isFinite(Number(p.preis_kg))) {
      kosten += kg * p.preis_kg;
    } else {
      const baekoPreis = findZutatPreis(z.name);
      if (baekoPreis !== null) kosten += kg * baekoPreis;
    }
  });
  return kosten;
}

// Rohstoffkosten pro Kalkulationsbasis: 1 Stück (Teiggewicht) bzw. bei
// Kuchen 1 Basis-Blech. Liefert die Zeilen für die Anzeige mit; Wasser
// zählt bewusst als 0 € ohne Warnung, Zutaten ohne Preis landen in
// ohnePreis (Summe wäre sonst stillschweigend zu niedrig).
// eigenePreise: { zutatName: { preis_kg } } (aus DB-prices abgeleitet)
export function berechneRohstoffkosten(rezept, eigenePreise = {}) {
  const istBlech = rezept.berechnung === 'blech';
  if (rezept.berechnungsfehler) return { summe: 0, zeilen: [], ohnePreis: [rezept.berechnungsfehler], istBlech, fehler: rezept.berechnungsfehler };
  let sk;
  try { sk = istBlech ? skaliereBlech(rezept, 1) : skaliere(rezept, 1); }
  catch(err) { return { summe:0, zeilen:[], ohnePreis:[err.message], istBlech, fehler:err.message }; }

  const zeilen = [];
  const ohnePreis = [];
  let summe = 0;
  rezept.zutaten.forEach((z, idx) => {
    if (z.ist_kommentar || !z.name || z.name.toLowerCase() === 'gesamt') return;
    const kg = sk[idx] || 0;
    if (kg <= 0) return;
    const eigen = eigenePreise[z.name];
    const preisKg = eigen?.fehler ? null : eigen?.preis_kg ?? findZutatPreis(z.name);
    const istWasser = istKostenfreiesWasser(z.name);
    const kosten = preisKg != null ? kg * preisKg : 0;
    summe += kosten;
    if (preisKg == null && !istWasser) ohnePreis.push(eigen?.fehler || z.name);
    zeilen.push({
      name: z.name,
      gramm: kg * 1000,
      preisKg,
      kosten,
      referenzen: eigen?.referenzen || [],
      preis_hinweise: eigen?.preis_hinweise || [],
      quelle: eigen?.preis_kg != null ? eigen.quelle || 'eigen' : preisKg != null ? 'bäko' : istWasser ? 'wasser' : 'fehlt',
    });
  });
  if (!zeilen.length) {
    const fehler = 'Keine berechenbare Zutatenmenge';
    return { summe: 0, zeilen, ohnePreis: [fehler], istBlech, fehler };
  }
  return { summe, zeilen, ohnePreis, istBlech };
}

// Preis und Preiseinheit nur anhand eindeutiger Spaltenüberschriften lesen.
// Die Vorschau wird erst durch den Speichern-Klick übernommen.
export function parseBaekoCSV(text, bekannteZutaten) {
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"') { field+='"';i++; } else quoted=!quoted; }
    else if(c===';' && !quoted) { row.push(field.trim());field=''; }
    else if((c==='\n' || c==='\r') && !quoted) { if(c==='\r' && text[i+1]==='\n') i++;row.push(field.trim());if(row.some(Boolean)) rows.push(row);row=[];field=''; }
    else field+=c;
  }
  if(quoted) throw new Error('Nicht geschlossenes Anführungszeichen in der CSV.');
  row.push(field.trim());if(row.some(Boolean)) rows.push(row);
  const norm=s=>String(s||'').replace(/^\uFEFF/,'').toLowerCase().replace(/\s+/g,' ').trim();
  const header=(rows.shift()||[]).map(norm);
  const idx=(...names)=>header.findIndex(h=>names.includes(h));
  const ni=idx('artikelbezeichnung','artikel','bezeichnung','zutat','name'), pi=idx('preis','preis €/kg','eur/kg','€/kg','preis_eur_kg'), pei=idx('pe','preiseinheit'), ui=idx('gr.','einheit','mengeneinheit');
  if(ni<0 || pi<0) throw new Error('Spalten Artikelbezeichnung/Name und Preis bzw. €/kg fehlen.');
  const perKg=['preis €/kg','eur/kg','€/kg','preis_eur_kg'].includes(header[pi]);
  if(!perKg && ui<0) throw new Error('Preiseinheit fehlt. Für Kilopreise die Spalte €/kg verwenden.');
  const num=s=>Number(String(s||'').trim().replace(/\.(?=\d{3}(?:[.,]|$))/g,'').replace(',','.'));
  const matches=new Map();
  for(const [i,r] of rows.entries()) {
    const article=r[ni], hit=bekannteZutaten.find(z=>norm(z)===norm(article));
    if(!hit) continue;
    if(!perKg && norm(r[ui])!=='kg') throw new Error(`Zeile ${i+2}: ${article} ist kein Kilopreis. Gebindegewicht prüfen.`);
    const pe=perKg ? 1 : pei<0 ? 1 : num(r[pei]);
    const price=num(r[pi]);
    if(!r[pi] || !Number.isFinite(price) || price<0 || !Number.isFinite(pe) || pe<=0) throw new Error(`Zeile ${i+2}: ungültiger Preis oder Preiseinheit.`);
    if(matches.has(hit)) throw new Error(`Mehrere Artikel für ${hit}. Zuordnung vor dem Import klären.`);
    matches.set(hit,{zutat_name:hit,preis_eur_kg:price/pe,lieferant:'BÄKO',artikel:article});
  }
  return [...matches.values()];
}
