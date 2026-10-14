const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const number = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const text = x => typeof x === 'string' && x.trim().length > 0;
export function validateRecipe(r) {
  const errors = [];
  if (!record(r) || !text(r.id) || !text(r.name)) return ['Rezept-ID und Name erforderlich.'];
  if (r.id.length > 100 || r.name.length > 300) errors.push('Rezept-ID oder Name zu lang.');
  if (!Array.isArray(r.zutaten)) return [...errors, 'Zutaten müssen eine Liste sein.'];
  if (r.berechnung != null && !['blech', 'stueck'].includes(r.berechnung)) errors.push('Ungültiger Berechnungsmodus.');
  if (r.rezeptart && !['teig', 'masse', 'mischung', 'unbekannt'].includes(r.rezeptart)) errors.push('Ungültige Rezeptart.');
  if (r.verkaufsartikel != null && typeof r.verkaufsartikel !== 'boolean') errors.push('Verkaufsartikel muss Ja/Nein sein.');
  if (r.backverlust_pct != null && (!number(r.backverlust_pct) || r.backverlust_pct >= 100)) errors.push('Backverlust muss zwischen 0 und unter 100 % liegen.');
  if (r.backverlust_status != null && !['unbestaetigt', 'geschaetzt', 'gemessen'].includes(r.backverlust_status)) errors.push('Grundlage des Backverlusts ungültig.');
  for (const key of ['stueckgewicht_g', 'min_stueck', 'max_stueck', 'blech_breite_cm', 'blech_laenge_cm', 'kz_langsam', 'kz_schnell', 'stockgare', 'stueckgare', 'backzeit']) {
    if (r[key] != null && !number(r[key])) errors.push(`${key}: ungültige Zahl.`);
  }
  if (r.stueckgewicht_g === 0) errors.push('Stückgewicht muss positiv sein.');
  if (r.min_stueck > r.max_stueck) errors.push('Mindestmenge übersteigt Höchstmenge.');
  if (r.naehrwert_hinweis != null && (typeof r.naehrwert_hinweis !== 'string' || r.naehrwert_hinweis.length > 2000)) errors.push('Nährwerthinweis ist ungültig.');
  const products = r.produkte ?? [];
  if (!Array.isArray(products)) return [...errors, 'Produkte müssen eine Liste sein.'];
  const names = new Set();
  for (const p of products) {
    if (!record(p) || !text(p.name) || !number(p.gewicht_g) || p.gewicht_g === 0 || (p.stueck_pro_presse != null && (!number(p.stueck_pro_presse) || !Number.isInteger(p.stueck_pro_presse)))) {
      errors.push('Produktname, Gewicht oder Stück pro Presse ungültig.'); continue;
    }
    if (names.has(p.name.toLowerCase())) errors.push(`Doppelter Produktname: ${p.name}`);
    names.add(p.name.toLowerCase());
    if (p.backverlust_pct != null && (!number(p.backverlust_pct) || p.backverlust_pct >= 100)) errors.push(`Backverlust von ${p.name} ungültig.`);
    if (p.backverlust_status != null && !['unbestaetigt', 'geschaetzt', 'gemessen'].includes(p.backverlust_status)) errors.push(`Grundlage des Backverlusts von ${p.name} ungültig.`);
  }
  for (const z of r.zutaten) {
    if (!record(z) || !text(z.name) || !number(z.menge_kg)) { errors.push('Zutatname oder Zutatenmenge ungültig.'); continue; }
    for (const k of ['ist_mehl', 'ist_wasser', 'ist_kommentar', 'nicht_auf_bon', 'vorstufe_nur_mehl_wasser', 'ta_naeherung']) if (z[k] != null && typeof z[k] !== 'boolean') errors.push(`${z.name}: ${k} muss Ja/Nein sein.`);
    for (const k of ['zusatz_prozent', 'menge_pro_presse', 'dosen_gewicht_g']) if (z[k] != null && !number(z[k])) errors.push(`${z.name}: ${k} ungültig.`);
    if (z.ist_mehl && z.ist_wasser) errors.push(`${z.name}: gleichzeitig Mehl und Wasser markiert.`);
    if (z.fuer_produkte != null && (!Array.isArray(z.fuer_produkte) || z.fuer_produkte.some(p => !text(p)))) errors.push(`${z.name}: Produktzuordnung ungültig.`);
    if (z.ta_rolle && !['mehl', 'fluessigkeit', 'sonstiges', 'vorstufe'].includes(z.ta_rolle)) errors.push(`${z.name}: TA-Zuordnung ungültig.`);
    if (z.prozent_bezug && !['mehl', 'basisteig', 'endprodukt', 'auflage'].includes(z.prozent_bezug)) errors.push(`${z.name}: Prozentbezug ungültig.`);
    if (z.presse_bezug && !['zusaetzlich', 'endprodukt'].includes(z.presse_bezug)) errors.push(`${z.name}: Pressenbezug ungültig.`);
    if (z.vorstufe_ta != null && (!number(z.vorstufe_ta) || z.vorstufe_ta < 100)) errors.push(`${z.name}: Vorstufen-TA ungültig.`);
    if (z.ta_anteile && (!record(z.ta_anteile) || !number(z.ta_anteile.mehl_kg) || !number(z.ta_anteile.fluessigkeit_kg) || z.menge_kg <= 0 || z.ta_anteile.mehl_kg + z.ta_anteile.fluessigkeit_kg > z.menge_kg + 1e-9)) errors.push(`${z.name}: Vorstufenanteile passen nicht zur Gesamtmenge.`);
    if (z.ta_pro_kg && (!record(z.ta_pro_kg) || !number(z.ta_pro_kg.mehl_kg) || !number(z.ta_pro_kg.fluessigkeit_kg) || z.ta_pro_kg.mehl_kg + z.ta_pro_kg.fluessigkeit_kg > 1 + 1e-9)) errors.push(`${z.name}: Vorstufenanteile pro kg sind ungültig.`);
    if (z.ta_hinweis != null && (typeof z.ta_hinweis !== 'string' || z.ta_hinweis.length > 2000)) errors.push(`${z.name}: TA-Hinweis ist ungültig.`);
    if (z.einheit === 'dose' && !(z.dosen_gewicht_g > 0)) errors.push(`${z.name}: Dosengewicht fehlt.`);
  }
  return errors;
}

export function validateCustomIngredient(data) {
  if (!record(data)) return ['Nährwertdaten müssen ein Objekt sein.'];
  const errors = [];
  for (const k of ['kj', 'kcal', 'eiweiss', 'protein', 'fett', 'fat', 'gfs', 'kh', 'carbs', 'zucker', 'sugar', 'ballaststoffe', 'fiber', 'salz']) {
    if (data[k] != null && (!number(data[k]) || data[k] > (k === 'kj' ? 4200 : k === 'kcal' ? 1000 : 100))) errors.push(`${k}: ungültiger Wert pro 100 g.`);
  }
  for (const k of ['a', 'allergene', 'spuren']) if (data[k] != null && (!Array.isArray(data[k]) || data[k].some(x => !/^[A-N][a-h]?$/.test(x)))) errors.push(`${k}: ungültige Allergencodes.`);
  const fett = data.fett ?? data.fat, kh = data.kh ?? data.carbs;
  if ((number(data.gfs) && number(fett) && data.gfs > fett) || (number(data.zucker) && number(kh) && data.zucker > kh)) errors.push('Gesättigte Fettsäuren/Zucker dürfen Fett/Kohlenhydrate nicht übersteigen.');
  if (data.allergene_geprueft != null && typeof data.allergene_geprueft !== 'boolean') errors.push('Allergenprüfung muss Ja/Nein sein.');
  for (const k of ['zusammengesetzt', 'zutaten_geprueft']) if (data[k] != null && typeof data[k] !== 'boolean') errors.push(`${k} muss Ja/Nein sein.`);
  if (data.zutaten_lmiv != null && (typeof data.zutaten_lmiv !== 'string' || data.zutaten_lmiv.length > 20000)) errors.push('Zutatenliste ist ungültig.');
  return errors;
}

export function validatePrices(prices) {
  if (!Array.isArray(prices)) return ['Preise müssen eine Liste sein.'];
  return prices.flatMap(p => !record(p) || !text(p.zutat_name) || (!p.deleted && (!number(Number(p.preis_eur_kg)) || p.preis_eur_kg === '' || p.preis_eur_kg == null)) ? ['Ungültiger Preiseintrag.'] : []);
}
export { record as isRecord };
