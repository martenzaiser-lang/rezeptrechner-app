// Preis-Lookup + Rezeptkosten — 1:1 aus der alten App (Z. 4297, 5486).
// Eigene Preise (DB) haben Vorrang, BAEKO-Standardpreise sind Fallback.

import { ZUTAT_PREISE } from '../data/baekoPreise.js';
import { skaliere, skaliereBlech } from './calc/skalierung.js';

export function findZutatPreis(zutatName) {
  if (!zutatName) return null;
  const name = zutatName.toLowerCase().trim();
  if (ZUTAT_PREISE[name] !== undefined) return ZUTAT_PREISE[name];
  return null;
}

export function fehlendePreise(r, sk, eigenePreise = {}) {
  return r.zutaten.filter((z, i) => !z.ist_kommentar && sk?.[i] > 0 &&
    !/^(wasser|schüttwasser|leitungswasser|trinkwasser)$/i.test(z.name.trim()) &&
    eigenePreise[z.name]?.preis_kg == null && findZutatPreis(z.name) == null).map(z => z.name);
}

// eigenePreise: { zutatName: { preis_kg } } (aus DB-prices abgeleitet)
export function calcRezeptKosten(r, sk, eigenePreise = {}) {
  if (!sk || !sk.length) return 0;
  let kosten = 0;
  r.zutaten.forEach((z, idx) => {
    const kg = sk[idx] || 0;
    const p = eigenePreise[z.name];
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
    const preisKg = eigen?.preis_kg ?? findZutatPreis(z.name);
    const istWasser = /^(wasser|schüttwasser|leitungswasser|trinkwasser)$/i.test(z.name.trim());
    const kosten = preisKg != null ? kg * preisKg : 0;
    summe += kosten;
    if (preisKg == null && !istWasser) ohnePreis.push(z.name);
    zeilen.push({
      name: z.name,
      gramm: kg * 1000,
      preisKg,
      kosten,
      quelle: eigen?.preis_kg != null ? 'eigen' : preisKg != null ? 'bäko' : istWasser ? 'wasser' : 'fehlt',
    });
  });
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
