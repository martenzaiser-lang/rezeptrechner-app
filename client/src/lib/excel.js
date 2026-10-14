import { istKeinTaMehl } from './calc/ta.js';
import { makeBackup } from '../../../shared/backup.js';
// Excel-/JSON-Export und -Import — 1:1 aus der alten App
// (exportExcel Z. 4170, parseStandardFormat Z. 4178, parseBakereiFormat
// Z. 4183, exportJSON Z. 4171, downloadTemplate Z. 4172).
//
// Format Standard: 2 Blaetter "Rezepte" + "Zutaten", Update-by-Name,
// Fuer_Produkte als ';'-Liste. parseBakereiFormat liest historische
// Baeckerei-Arbeitsblaetter (ein Rezept pro Sheet, Heuristiken).

// xlsx (424 kB) wird erst beim ersten Export/Import geladen — haelt das
// Initial-Bundle der Verwaltung klein (wichtig auf den Tablets).
let xlsxPromise;
function getXLSX() {
  xlsxPromise ??= import('xlsx');
  return xlsxPromise;
}

export async function buildExcelWorkbook(rezepte) {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();
  const rH = ['ID', 'Name', 'Kategorie', 'Aktiv', 'Teiggewicht_g', 'Backverlust_pct', 'Min_Stueck', 'Max_Stueck', 'Teigtemp_C', 'Knetzeit_langsam_min', 'Knetzeit_schnell_min', 'Stockgare_min', 'Stueckgare_min', 'Backtemp_Ober_C', 'Backtemp_Unter_C', 'Backzeit_min', 'Bedampfung', 'Bedampf_Hinweis', 'Anmerkungen', 'Erstellt'];
  const rR = rezepte.map((r) => [r.id, r.name, r.kategorie, r.aktiv ? 'JA' : 'NEIN', r.stueckgewicht_g, r.backverlust_pct, r.min_stueck, r.max_stueck, r.teigtemp_c, r.kz_langsam, r.kz_schnell, r.stockgare, r.stueckgare, r.back_ober, r.back_unter, r.backzeit, r.bedampfung ? 'JA' : 'NEIN', r.bedampf_hinweis, r.anmerkungen, r.erstellt]);
  rH.push('Berechnung', 'Blech_Breite_cm', 'Blech_Laenge_cm', 'Produkte_JSON', 'BonOptionen_JSON', 'Rezeptart', 'Backverlust_Status', 'Backverlust_Quelle', 'Naehrwert_Hinweis');
  rR.forEach((row, i) => { const r = rezepte[i]; row.push(r.berechnung, r.blech_breite_cm, r.blech_laenge_cm, JSON.stringify(r.produkte || []), JSON.stringify(r.bonOptionen || null), r.rezeptart || '', r.backverlust_status || '', r.backverlust_quelle || '', r.naehrwert_hinweis || ''); });
  const ws1 = XLSX.utils.aoa_to_sheet([rH, ...rR]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Rezepte');
  const zH = ['Rezept_ID', 'Rezept_Name', 'Zutat_Name', 'Menge_kg', 'Ist_Mehl', 'Ist_Wasser', 'Bemerkung', 'Fuer_Produkte'];
  zH.push('Ist_Kommentar', 'Einheit', 'Dosen_Gewicht_g', 'Zusatz_Prozent', 'Menge_pro_Presse', 'Nicht_auf_Bon', 'TA_Anteile_JSON', 'Vorstufe_nur_Mehl_Wasser', 'Vorstufe_TA', 'TA_Rolle', 'Prozent_Bezug', 'Presse_Bezug', 'TA_pro_kg_JSON', 'TA_Naeherung', 'TA_Hinweis');
  const zR = [];
  rezepte.forEach((r) =>
    r.zutaten.forEach((z) =>
      zR.push([r.id, r.name, z.name, z.menge_kg, z.ist_mehl ? 'JA' : 'NEIN', z.ist_wasser ? 'JA' : 'NEIN', z.bemerkung || '', (z.fuer_produkte || []).join(';'), z.ist_kommentar ? 'JA' : 'NEIN', z.einheit || '', z.dosen_gewicht_g || 0, z.zusatz_prozent || 0, z.menge_pro_presse || 0, z.nicht_auf_bon ? 'JA' : 'NEIN', JSON.stringify(z.ta_anteile || null), z.vorstufe_nur_mehl_wasser ? 'JA' : 'NEIN', z.vorstufe_ta ?? '', z.ta_rolle || '', z.prozent_bezug || '', z.presse_bezug || '', JSON.stringify(z.ta_pro_kg || null), z.ta_naeherung ? 'JA' : 'NEIN', z.ta_hinweis || ''])
    )
  );
  const ws2 = XLSX.utils.aoa_to_sheet([zH, ...zR]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Zutaten');
  return wb;
}

export async function exportExcel(rezepte) {
  const XLSX = await getXLSX();
  XLSX.writeFile(await buildExcelWorkbook(rezepte), `Rezepte_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadTemplate() {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['ID', 'Name', 'Kategorie', 'Aktiv', 'Teiggewicht_g', 'Backverlust_pct'],
    ['', 'Roggenmischbrot', 'Brot', 'JA', 750, 12],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Rezepte');
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Rezept_Name', 'Zutat_Name', 'Menge_kg', 'Ist_Mehl', 'Ist_Wasser', 'Bemerkung', 'Fuer_Produkte'],
    ['Roggenmischbrot', 'Roggenmehl 997', 0.7, 'JA', 'NEIN', '', ''],
    ['Roggenmischbrot', 'Wasser', 0.62, 'NEIN', 'JA', '', ''],
    ['Roggenmischbrot', 'Mohn', 0.05, 'NEIN', 'NEIN', '', 'Mohnbrötchen'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Zutaten');
  XLSX.writeFile(wb, 'Rezeptrechner_Vorlage.xlsx');
}

export function exportJSON(rezepte, cfg, prices = [], customIngredients = []) {
  const data = makeBackup({ recipes: rezepte, settings: cfg, prices, customIngredients });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Sicherung_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function parseStandardFormat(wb) {
  const XLSX = await getXLSX();
  const sR = wb.SheetNames.find((n) => n.toLowerCase().includes('rezept')) || wb.SheetNames[0];
  const sZ = wb.SheetNames.find((n) => n.toLowerCase().includes('zutat')) || wb.SheetNames[1];
  if (!sR) return [];
  const rowsR = XLSX.utils.sheet_to_json(wb.Sheets[sR], { defval: '' });
  const rowsZ = sZ ? XLSX.utils.sheet_to_json(wb.Sheets[sZ], { defval: '' }) : [];
  if (!rowsR.length) return [];

  const fc = (row, ...keys) => {
    const rk = Object.keys(row);
    for (const k of keys) {
      const f = rk.find((r) => r.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, ''));
      if (f !== undefined) return row[f];
    }
    return undefined;
  };

  const num = (v, fallback = 0) => {
    if (v == null || v === '') return fallback;
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) throw new Error('Ungültige Zahl im Excel-Import: ' + v);
    return n;
  };
  const json = (v, fallback) => v == null || v === '' ? fallback : JSON.parse(String(v));
  const parsed = [];
  rowsR.forEach((row) => {
    const name = fc(row, 'name', 'rezeptname');
    if (!name || String(name).trim() === '' || String(name).trim() === 'Name') return;
    const r = {
      id: fc(row, 'id') || '',
      name: String(name).trim(),
      kategorie: fc(row, 'kategorie') || 'Brot',
      aktiv: String(fc(row, 'aktiv') || 'JA').toUpperCase() !== 'NEIN',
      stueckgewicht_g: num(fc(row, 'teiggewicht_g', 'stueckgewicht_g', 'fertiggewicht_g', 'fertiggewicht'), 500),
      backverlust_pct: num(fc(row, 'backverlust_pct', 'backverlust'), null),
      backverlust_status: fc(row, 'backverlust_status') || 'unbestaetigt',
      backverlust_quelle: fc(row, 'backverlust_quelle') || '',
      naehrwert_hinweis: fc(row, 'naehrwert_hinweis') || '',
      min_stueck: Math.trunc(num(fc(row, 'min_stueck', 'min'), 1)),
      max_stueck: Math.trunc(num(fc(row, 'max_stueck', 'max'), 999)),
      teigtemp_c: num(fc(row, 'teigtemp_c', 'teigtemp'), 26),
      kz_langsam: Math.trunc(num(fc(row, 'knetzeit_langsam_min', 'kzlangsam'), 5)),
      kz_schnell: Math.trunc(num(fc(row, 'knetzeit_schnell_min', 'kzschnell'), 8)),
      stockgare: Math.trunc(num(fc(row, 'stockgare_min', 'stockgare'), 30)),
      stueckgare: Math.trunc(num(fc(row, 'stueckgare_min', 'stueckgare'), 45)),
      back_ober: Math.trunc(num(fc(row, 'backtemp_ober_c', 'backober'), 230)),
      back_unter: Math.trunc(num(fc(row, 'backtemp_unter_c', 'backunter'), 230)),
      backzeit: Math.trunc(num(fc(row, 'backzeit_min', 'backzeit'), 35)),
      bedampfung: String(fc(row, 'bedampfung') || '').toUpperCase() === 'JA',
      bedampf_hinweis: String(fc(row, 'bedampf_hinweis') || ''),
      anmerkungen: String(fc(row, 'anmerkungen') || ''),
      berechnung: fc(row, 'berechnung') || undefined,
      blech_breite_cm: num(fc(row, 'blech_breite_cm')),
      blech_laenge_cm: num(fc(row, 'blech_laenge_cm')),
      produkte: json(fc(row, 'produkte_json'), []),
      bonOptionen: json(fc(row, 'bonoptionen_json'), null),
      rezeptart: fc(row, 'rezeptart') || undefined,
      erstellt: fc(row, 'erstellt') || undefined,
      zutaten: [],
    };
    rowsZ.forEach((z) => {
      const zn = fc(z, 'rezept_name', 'rezeptname', 'rezept');
      const zid = fc(z, 'rezept_id');
      if (zid && r.id ? String(zid) !== String(r.id) : !zn || String(zn).trim() !== r.name) return;
      const n = fc(z, 'zutat_name', 'zutat', 'name');
      if (!n || String(n).trim() === '') return;
      const fp = String(fc(z, 'fuer_produkte', 'fuerprodukte') || '').trim();
      r.zutaten.push({
        name: String(n).trim(),
        menge_kg: num(fc(z, 'menge_kg', 'menge'), 0),
        ist_mehl: String(fc(z, 'ist_mehl', 'mehl') || '').toUpperCase() === 'JA',
        ist_kommentar: String(fc(z, 'ist_kommentar')).toUpperCase() === 'JA',
        einheit: fc(z, 'einheit') || '',
        dosen_gewicht_g: num(fc(z, 'dosen_gewicht_g')),
        zusatz_prozent: num(fc(z, 'zusatz_prozent')),
        menge_pro_presse: num(fc(z, 'menge_pro_presse')),
        nicht_auf_bon: String(fc(z, 'nicht_auf_bon')).toUpperCase() === 'JA',
        ta_rolle: fc(z, 'ta_rolle') || '',
        prozent_bezug: fc(z, 'prozent_bezug') || '',
        presse_bezug: fc(z, 'presse_bezug') || '',
        ta_anteile: json(fc(z, 'ta_anteile_json'), null),
        ta_pro_kg: json(fc(z, 'ta_pro_kg_json'), null),
        ta_naeherung: String(fc(z, 'ta_naeherung')).toUpperCase() === 'JA',
        ta_hinweis: fc(z, 'ta_hinweis') || '',
        vorstufe_nur_mehl_wasser: String(fc(z, 'vorstufe_nur_mehl_wasser')).toUpperCase() === 'JA',
        vorstufe_ta: fc(z, 'vorstufe_ta') ? num(fc(z, 'vorstufe_ta')) : undefined,
        ist_wasser: String(fc(z, 'ist_wasser', 'wasser') || '').toUpperCase() === 'JA',
        bemerkung: String(fc(z, 'bemerkung') || ''),
        fuer_produkte: fp ? fp.split(';').map((s) => s.trim()).filter((s) => s) : [],
      });
    });
    parsed.push(r);
  });
  return parsed;
}

// Historisches Baeckerei-Arbeitsblatt-Format (ein Rezept pro Sheet).
export async function parseBakereiFormat(wb) {
  const XLSX = await getXLSX();
  const SKIP = ['Auswahlblatt', 'Rohdaten', 'Tabelle1', 'Tabelle2', 'Tabelle3', 'Übersicht', 'Auswahl', 'Index'];
  const STOP = ['gesamt', 'brote', 'pressen', 'zurück', 'gewicht pro presse', 'summe'];
  const SECTION = ['quellstück', 'kochstück', 'hefestück', 'hauptteig', 'einweichen', 'sauerteig', 'vorteig', 'brühstück', 'poolish', 'biga'];
  const MEHL = ['mehl', 'grieß', 'griess', 'schrot', 'dunst'];
  const isNum = (v) => v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v));
  const isMehl = (n) => !istKeinTaMehl({ name: n }) && MEHL.some((k) => n.toLowerCase().includes(k));
  const isWasser = (n) => n.toLowerCase() === 'wasser' || n.toLowerCase() === 'water';
  const isSection = (n) => SECTION.some((k) => n.toLowerCase().trim().includes(k));
  const isStop = (n) => STOP.some((k) => n.toLowerCase().trim().startsWith(k));
  const guessKat = (n) => {
    const l = n.toLowerCase();
    if (l.includes('brötchen') || l.includes('semmel') || l.includes('weck')) return 'Brötchen';
    if (l.includes('berliner') || l.includes('krapfen')) return 'Berliner / Krapfen';
    if (l.includes('croissant') || l.includes('plunder')) return 'Plunder';
    if (l.includes('kuchen') || l.includes('stollen')) return 'Kuchen';
    if (l.includes('torte') || l.includes('sahne')) return 'Kuchen';
    return 'Brot';
  };

  const parsed = [];
  wb.SheetNames.forEach((sheetName) => {
    if (SKIP.some((s) => s.toLowerCase() === sheetName.toLowerCase().trim())) return;
    if (sheetName.trim().length < 2) return;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) return;

    let rezeptName = '';
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const v = String(rows[i]?.[0] || '').trim();
      if (v && v.length > 1 && !isNum(v) && !v.toLowerCase().includes('menge') && !v.toLowerCase().includes('zutaten')) {
        rezeptName = v;
        break;
      }
    }
    if (!rezeptName) rezeptName = sheetName.trim();
    if (!rezeptName || rezeptName.length < 2) return;

    let stueckgewicht = 500;
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      for (let c = 0; c < (rows[i] || []).length; c++) {
        const v = String(rows[i]?.[c] || '');
        const m = v.match(/einwaage\s*(\d+[,.]?\d*)\s*(kg|g)/i) || v.match(/(\d+[,.]?\d*)\s*(kg|g)\s*pro\s*st/i);
        if (m) {
          let gew = parseFloat(m[1].replace(',', '.'));
          if (m[2].toLowerCase() === 'kg') gew *= 1000;
          stueckgewicht = Math.round(gew);
        }
      }
    }

    const produkte = [];
    for (let i = 0; i < Math.min(12, rows.length); i++) {
      const colC = String(rows[i]?.[2] || '').trim();
      const colD = rows[i]?.[3];
      const colE = rows[i]?.[4];
      if (colC && colC.length > 1 && !['anzahl', 'gewicht', 'menge', 'gesamtgewicht', 'brote'].some((k) => colC.toLowerCase().includes(k)) && isNum(colD) && parseFloat(colD) > 0 && isNum(colE) && parseFloat(colE) > 0) {
        let gewicht = parseFloat(colE);
        if (gewicht < 10) gewicht *= 1000;
        if (gewicht >= 50 && gewicht <= 10000) produkte.push({ name: colC, gewicht_g: Math.round(gewicht) });
      }
    }
    if (!produkte.length) {
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const colE = String(rows[i]?.[4] || '').trim();
        const colF = rows[i]?.[5];
        if (colE && colE.length > 1 && !['knetzeit', 'menge', 'kuchenart'].some((k) => colE.toLowerCase().includes(k)) && isNum(colF) && parseFloat(colF) >= 0) {
          const skip = ['gesamt', 'zurück', 'rosinen', ''];
          if (!skip.includes(colE.toLowerCase()) && colE.length > 2) {
            let gewicht = 500;
            const match = colE.match(/(\d+)\s*g/i);
            if (match) gewicht = parseInt(match[1]);
            if (parseFloat(colF) > 0) produkte.push({ name: colE, gewicht_g: gewicht });
          }
        }
      }
    }

    let headerRow = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const colB = String(rows[i]?.[1] || '').trim().toLowerCase();
      if (colB === 'zutaten' || colB === 'zutat' || colB === 'bezeichnung' || colB === 'artikel') {
        headerRow = i;
        break;
      }
    }
    if (headerRow < 0) {
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const colA = rows[i]?.[0];
        const colB = String(rows[i]?.[1] || '').trim();
        if (isNum(colA) && parseFloat(colA) > 0 && colB && !isNum(colB) && colB.length > 1) {
          headerRow = i - 1;
          break;
        }
      }
    }
    if (headerRow < 0) headerRow = 0;

    let kzL = 5;
    let kzS = 8;
    for (let i = 0; i <= Math.min(headerRow + 2, rows.length - 1); i++) {
      for (let c = 0; c < (rows[i] || []).length; c++) {
        const v = String(rows[i]?.[c] || '');
        if (v.toLowerCase().includes('langsam') && v.toLowerCase().includes('schnell')) {
          const m1 = v.match(/(\d+)\s*[´'`]?\s*langsam/i);
          const m2 = v.match(/(\d+)\s*[´'`]?\s*schnell/i);
          if (m1) kzL = parseInt(m1[1]);
          if (m2) kzS = parseInt(m2[1]);
        }
      }
    }

    const zutaten = [];
    let currentSection = '';
    const anmerkungen = [];
    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      const colA = row[0];
      let colB = String(row[1] || '').trim();
      const colC = String(row[2] || '').trim();
      const colE = String(row[4] || '').trim();
      if (!colB && colC) colB = colC;
      if (!colB) continue;
      if (isStop(colB)) break;
      if (colB.toLowerCase() === 'zurück') continue;
      if (isSection(colB) && !(isNum(colA) && parseFloat(colA) > 0)) {
        currentSection = colB.charAt(0).toUpperCase() + colB.slice(1).toLowerCase();
        continue;
      }
      if (isNum(colA) && parseFloat(colA) > 0) {
        const menge = parseFloat(colA);
        const bemParts = [];
        if (currentSection) bemParts.push(currentSection);
        if (colE && colE !== '0' && !isNum(colE) && colE.length > 1) bemParts.push(colE);
        zutaten.push({ name: colB, menge_kg: Math.round(menge * 10000) / 10000, ist_mehl: isMehl(colB), ist_wasser: isWasser(colB), bemerkung: bemParts.join(' – ') });
      } else if (colA && String(colA).trim() !== '' && !isNum(colA) && colB) {
        const hint = String(colA).trim();
        if (hint.length > 0 && hint.length < 50) {
          zutaten.push({ name: colB, menge_kg: 0, ist_mehl: false, ist_wasser: false, bemerkung: hint + (currentSection ? ' – ' + currentSection : '') });
        }
      }
    }
    if (!zutaten.length) return;

    for (let i = 0; i < headerRow; i++) {
      for (let c = 2; c < (rows[i] || []).length; c++) {
        const v = String(rows[i]?.[c] || '').trim();
        if (v && v.length > 8 && !isNum(v) && !v.toLowerCase().includes('menge') && !v.toLowerCase().includes('knetzeit')) {
          if (!anmerkungen.includes(v)) anmerkungen.push(v);
        }
      }
    }

    parsed.push({
      id: '', name: rezeptName, kategorie: guessKat(rezeptName), aktiv: true,
      produkte: produkte.length > 1 ? produkte : [],
      stueckgewicht_g: stueckgewicht, backverlust_pct: 10, min_stueck: 1, max_stueck: 999,
      teigtemp_c: 26, kz_langsam: kzL, kz_schnell: kzS, stockgare: 30, stueckgare: 45,
      back_ober: 230, back_unter: 230, backzeit: 35, bedampfung: false, bedampf_hinweis: '',
      anmerkungen: anmerkungen.slice(0, 2).join('; '), zutaten,
    });
  });
  return parsed;
}

// Datei-Buffer parsen: Standard-Format bevorzugt, sonst Baeckerei-Format.
export async function parseImportBuffer(buf) {
  const XLSX = await getXLSX();
  const wb = XLSX.read(buf, { type: 'array' });
  const hasStd =
    wb.SheetNames.some((n) => n.toLowerCase().includes('rezept')) &&
    wb.SheetNames.some((n) => n.toLowerCase().includes('zutat'));
  return hasStd ? parseStandardFormat(wb) : parseBakereiFormat(wb);
}
