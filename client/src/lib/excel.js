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

export async function exportExcel(rezepte) {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();
  const rH = ['ID', 'Name', 'Kategorie', 'Aktiv', 'Fertiggewicht_g', 'Backverlust_pct', 'Min_Stueck', 'Max_Stueck', 'Teigtemp_C', 'Knetzeit_langsam_min', 'Knetzeit_schnell_min', 'Stockgare_min', 'Stueckgare_min', 'Backtemp_Ober_C', 'Backtemp_Unter_C', 'Backzeit_min', 'Bedampfung', 'Bedampf_Hinweis', 'Anmerkungen', 'Erstellt'];
  const rR = rezepte.map((r) => [r.id, r.name, r.kategorie, r.aktiv ? 'JA' : 'NEIN', r.stueckgewicht_g, r.backverlust_pct, r.min_stueck, r.max_stueck, r.teigtemp_c, r.kz_langsam, r.kz_schnell, r.stockgare, r.stueckgare, r.back_ober, r.back_unter, r.backzeit, r.bedampfung ? 'JA' : 'NEIN', r.bedampf_hinweis, r.anmerkungen, r.erstellt]);
  const ws1 = XLSX.utils.aoa_to_sheet([rH, ...rR]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Rezepte');
  const zH = ['Rezept_ID', 'Rezept_Name', 'Zutat_Name', 'Menge_kg', 'Ist_Mehl', 'Ist_Wasser', 'Bemerkung', 'Fuer_Produkte'];
  const zR = [];
  rezepte.forEach((r) =>
    r.zutaten.forEach((z) =>
      zR.push([r.id, r.name, z.name, z.menge_kg, z.ist_mehl ? 'JA' : 'NEIN', z.ist_wasser ? 'JA' : 'NEIN', z.bemerkung || '', (z.fuer_produkte || []).join(';')])
    )
  );
  const ws2 = XLSX.utils.aoa_to_sheet([zH, ...zR]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Zutaten');
  XLSX.writeFile(wb, `Rezepte_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadTemplate() {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['ID', 'Name', 'Kategorie', 'Aktiv', 'Fertiggewicht_g', 'Backverlust_pct'],
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

export function exportJSON(rezepte, cfg) {
  const data = { rezepte, cfg, exportiert: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Sicherung_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
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

  const parsed = [];
  rowsR.forEach((row) => {
    const name = fc(row, 'name', 'rezeptname');
    if (!name || String(name).trim() === '' || String(name).trim() === 'Name') return;
    const r = {
      id: fc(row, 'id') || '',
      name: String(name).trim(),
      kategorie: fc(row, 'kategorie') || 'Brot',
      aktiv: String(fc(row, 'aktiv') || 'JA').toUpperCase() !== 'NEIN',
      stueckgewicht_g: parseFloat(fc(row, 'fertiggewicht_g', 'fertiggewicht', 'stueckgewicht_g')) || 500,
      backverlust_pct: parseFloat(fc(row, 'backverlust_pct', 'backverlust')) || 10,
      min_stueck: parseInt(fc(row, 'min_stueck', 'min')) || 1,
      max_stueck: parseInt(fc(row, 'max_stueck', 'max')) || 999,
      teigtemp_c: parseFloat(fc(row, 'teigtemp_c', 'teigtemp')) || 26,
      kz_langsam: parseInt(fc(row, 'knetzeit_langsam_min', 'kzlangsam')) || 5,
      kz_schnell: parseInt(fc(row, 'knetzeit_schnell_min', 'kzschnell')) || 8,
      stockgare: parseInt(fc(row, 'stockgare_min', 'stockgare')) || 30,
      stueckgare: parseInt(fc(row, 'stueckgare_min', 'stueckgare')) || 45,
      back_ober: parseInt(fc(row, 'backtemp_ober_c', 'backober')) || 230,
      back_unter: parseInt(fc(row, 'backtemp_unter_c', 'backunter')) || 230,
      backzeit: parseInt(fc(row, 'backzeit_min', 'backzeit')) || 35,
      bedampfung: String(fc(row, 'bedampfung') || '').toUpperCase() === 'JA',
      bedampf_hinweis: String(fc(row, 'bedampf_hinweis') || ''),
      anmerkungen: String(fc(row, 'anmerkungen') || ''),
      zutaten: [],
    };
    rowsZ.forEach((z) => {
      const zn = fc(z, 'rezept_name', 'rezeptname', 'rezept');
      if (!zn || String(zn).trim() !== r.name) return;
      const n = fc(z, 'zutat_name', 'zutat', 'name');
      if (!n || String(n).trim() === '') return;
      const fp = String(fc(z, 'fuer_produkte', 'fuerprodukte') || '').trim();
      r.zutaten.push({
        name: String(n).trim(),
        menge_kg: parseFloat(fc(z, 'menge_kg', 'menge')) || 0,
        ist_mehl: String(fc(z, 'ist_mehl', 'mehl') || '').toUpperCase() === 'JA',
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
  const isMehl = (n) => MEHL.some((k) => n.toLowerCase().includes(k));
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
      if (isSection(colB)) {
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
