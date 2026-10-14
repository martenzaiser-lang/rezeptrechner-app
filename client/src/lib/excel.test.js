import { it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildExcelWorkbook, parseStandardFormat } from './excel.js';
import { mkRezept } from './mkRezept.js';
import { makeBackup, validateBackup } from '../../../shared/backup.js';
import { zutat, mehl, rezept } from '../../test/fach-fixtures.js';

it('Echter Excel-Exportkern erhält sämtliche fachlichen Metadaten', async () => {
  const input=mkRezept(rezept([
    mehl(1,{ta_rolle:'mehl'}),
    zutat('Schritt',0,{ist_kommentar:true}),
    zutat('Kirschen',.72,{einheit:'dose',dosen_gewicht_g:720,nicht_auf_bon:true}),
    zutat('Zucker',0,{zusatz_prozent:10,prozent_bezug:'mehl',fuer_produkte:['A']}),
    zutat('Kochstück',3,{ta_anteile:{mehl_kg:1,fluessigkeit_kg:2},ta_rolle:'vorstufe'}),
    zutat('Vorteig',0,{zusatz_prozent:20,ta_pro_kg:{mehl_kg:.5,fluessigkeit_kg:.5},ta_rolle:'vorstufe'}),
    zutat('Backmittel',.02,{ta_naeherung:true,ta_hinweis:'Hersteller-Stärkeschätzung',ta_rolle:'sonstiges'}),
  ],{kategorie:'Kuchen',rezeptart:'masse',berechnung:'stueck',blech_breite_cm:40,blech_laenge_cm:60,backverlust_pct:0,backverlust_status:'gemessen',backverlust_quelle:'Gewogen',naehrwert_hinweis:'Streusel nach Augenmaß',kz_langsam:0,kz_schnell:0,bonOptionen:{ta:false},produkte:[{name:'A',gewicht_g:500,backverlust_pct:12,backverlust_status:'geschaetzt'},{name:'B',gewicht_g:1000}]}));
  const wb=await buildExcelWorkbook([input]);
  const bytes=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  const [output]=await parseStandardFormat(XLSX.read(bytes,{type:'array'}));
  for(const key of ['id','name','kategorie','rezeptart','berechnung','blech_breite_cm','blech_laenge_cm','stueckgewicht_g','backverlust_pct','backverlust_status','backverlust_quelle','naehrwert_hinweis','kz_langsam','kz_schnell','bonOptionen','produkte']) expect(output[key],key).toEqual(input[key]);
  input.zutaten.forEach((z,i)=>expect(output.zutaten[i]).toMatchObject(z));
});
it('Dezimalkomma wird gelesen, unbekannter Backverlust bleibt unbekannt',async()=>{
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{ID:'a',Name:'Brot'}]),'Rezepte');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Rezept_ID:'a',Zutat_Name:'Mehl',Menge_kg:'1,5'}]),'Zutaten');
  const [r]=await parseStandardFormat(wb); expect(r.zutaten[0].menge_kg).toBe(1.5); expect(r.backverlust_pct).toBeNull();
});
it('Sicherung enthält alle vier Datengruppen ohne Nullwerte zu verlieren',()=>{
  const data={recipes:[rezept()],settings:{ta:false},prices:[{zutat_name:'Mehl',preis_eur_kg:0}],customIngredients:[{name:'Test',data:{kcal:0}}]};
  const b=JSON.parse(JSON.stringify(makeBackup(data))); expect(validateBackup(b)).toEqual([]); expect(b.prices[0].preis_eur_kg).toBe(0); expect(b.cfg.ta).toBe(false); expect(b.customIngredients).toEqual(data.customIngredients);
});
it('Ungültige oder unvollständige Sicherungen werden abgewiesen',()=>{
  expect(validateBackup({schemaVersion:2,rezepte:[]})).not.toEqual([]);
  expect(validateBackup({rezepte:[rezept(),rezept()]})).toContain('Doppelte Rezept-IDs.');
});
