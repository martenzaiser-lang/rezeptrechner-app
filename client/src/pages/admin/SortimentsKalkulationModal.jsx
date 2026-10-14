import { useMemo, useState } from 'react';
import { Download, Check, AlertCircle } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { KALKULATION_DEFAULTS } from '../../lib/kalkulation.js';
import { sortimentsKalkulation, sortimentsCSV, preisZahl, preisBasis } from '../../lib/sortimentskalkulation.js';
import { istVerkaufsrezept } from '../../lib/verkaufsrezept.js';
import RegionalePreise from './RegionalePreise.jsx';
import { downloadBlob } from '../../lib/download.js';
import '../../styles/sortiment.css';

const FELDER = [['schwundPct', 'Schwundzuschlag %'], ['personalPct', 'Personal %'], ['energiePct', 'Energie %'], ['gemeinkostenPct', 'Gemeinkosten %'], ['gewinnPct', 'Gewinn %'], ['ustPct', 'USt %']];
const de = n => Number.isFinite(n) ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export default function SortimentsKalkulationModal({ recipes, prices, settings, onClose, onSave }) {
  const saved = settings?.sortimentskalkulation || {};
  const [parameter, setParameter] = useState(() => Object.fromEntries(Object.entries({ ...KALKULATION_DEFAULTS, ...settings?.kalkulation, ...saved.parameter }).map(([k,v]) => [k, String(v).replace('.', ',')])));
  const [produkte, setProdukte] = useState(saved.produkte || {});
  const [rundung, setRundung] = useState(saved.rundung || .05);
  const [stundensatz, setStundensatz] = useState(saved.stundensatz ?? '');
  const [suche, setSuche] = useState(''), [kategorie, setKategorie] = useState(''), [nurPruefen, setNurPruefen] = useState(false);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [global, setGlobal] = useState(false);
  const confirm = useConfirm();
  const params = useMemo(() => Object.fromEntries(FELDER.map(([k]) => [k, preisZahl(parameter[k]) ?? NaN])), [parameter]);
  const rows = useMemo(() => sortimentsKalkulation(recipes, prices, params, produkte, rundung, preisZahl(stundensatz)).sort((a,b) => a.name.localeCompare(b.name, 'de')), [recipes, prices, params, produkte, rundung, stundensatz]);
  const pruefen = r => r.fehler.length || r.referenzen.length || r.hinweise.length || r.unterZiel;
  const sichtbar = rows.filter(r => (!suche || r.name.toLowerCase().includes(suche.toLowerCase())) && (!kategorie || r.kategorie === kategorie) && (!nurPruefen || pruefen(r)));
  const quotenOK = FELDER.every(([k]) => Number.isFinite(params[k]) && params[k] >= 0 && params[k] <= 100) && params.personalPct + params.energiePct + params.gemeinkostenPct + params.gewinnPct <= 95;
  const stundensatzOK = preisZahl(stundensatz) == null || Number.isFinite(preisZahl(stundensatz)) && preisZahl(stundensatz) > 0;
  const eingabenOK = stundensatzOK && rows.every(r => ['alterPreis', 'neuerPreis', 'portionen', 'arbeitsminuten'].every(k => {
    const v = preisZahl(produkte[r.key]?.[k]);
    return v == null || Number.isFinite(v) && (k === 'alterPreis' ? v >= 0 : v > 0) && (k !== 'portionen' || Number.isInteger(v));
  }));
  function update(key, field, value) {
    const row = rows.find(r => r.key === key);
    if (row.basisOffen) return;
    const rezept = recipes.find(r => r.id === row.rezeptId);
    setProdukte(prev => {
      const neu = { ...prev[key], [field]: value };
      if (field === 'portionen' && preisZahl(prev[key]?.portionen) !== preisZahl(value)) Object.assign(neu, { alterPreis: '', neuerPreis: '', arbeitsminuten: '' });
      neu.basis = preisBasis(rezept, row.name, neu.portionen);
      return { ...prev, [key]: neu };
    }); setDirty(true);
  }
  function bestaetigeBezug(row, leeren = false) {
    setProdukte(prev => ({ ...prev, [row.key]: { ...prev[row.key], basis: row.basis, ...(leeren ? { alterPreis: '', neuerPreis: '', arbeitsminuten: '' } : {}) } }));
    setDirty(true);
  }
  async function schliessen() {
    if (!dirty || await confirm({ title: 'Preisrunde schließen', message: 'Ungespeicherte Änderungen an diesem Entwurf verwerfen?', confirmText: 'Verwerfen' })) onClose();
  }
  function uebernehmen() {
    setProdukte(prev => {
      const next = { ...prev };
      for (const r of sichtbar) if (!r.fehler.length) next[r.key] = { ...next[r.key], basis: r.basis, neuerPreis: de(r.vorgeschlagen).replace(/\./g, '') };
      return next;
    }); setDirty(true);
  }
  async function speichern() {
    setBusy(true);
    try { await onSave({ sortimentskalkulation: { schemaVersion: 2, parameter: params, produkte, rundung, stundensatz, stand: new Date().toISOString() }, ...(global ? { kalkulation: params } : {}) }); }
    finally { setBusy(false); }
  }
  return <Modal title="Sortiment kalkulieren" maxWidth={1420} onClose={busy ? () => {} : schliessen} footer={<>
    <span className="sortiment-save-note" role="status">{dirty ? 'Entwurf geändert' : saved.stand ? `Entwurf vom ${new Date(saved.stand).toLocaleDateString('de-DE')}` : 'Neue Preisrunde'}</span>
    <button className="btn" disabled={busy} onClick={schliessen}>Schließen</button>
    <button className="btn btn-primary" disabled={busy || !quotenOK || !eingabenOK} onClick={speichern}>{busy ? 'Speichert…' : 'Entwurf speichern'}</button>
  </>}>
    <fieldset disabled={busy} className="sortiment-fields">
    <div className="sortiment-intro"><p>1. Einkaufspreise pflegen · 2. Kosten prüfen · 3. Preise vergleichen und exportieren</p>
      <p>Aktive Verkaufsartikel einschließlich Varianten. {recipes.filter(r => r.aktiv !== false && !istVerkaufsrezept(r)).length} interne Rezepturen ausgeblendet; die Zuordnung lässt sich in den Stammdaten ändern. Die Preisrunde bleibt ein Entwurf.</p></div>
    <RegionalePreise />
    <details className="sortiment-quoten" open={!saved.stand}>
      <summary>Betriebskosten und Rundung</summary>
      <div className="sortiment-parameter">{FELDER.map(([key,label]) => <label key={key}>{label}<input aria-label={label} inputMode="decimal" value={parameter[key]} onChange={e => { setParameter({ ...parameter, [key]: e.target.value }); setDirty(true); }} /></label>)}
        <label>Aufrunden auf<select aria-label="Preisrundung" value={rundung} onChange={e => { setRundung(Number(e.target.value)); setDirty(true); }}><option value={.05}>5 Cent</option><option value={.1}>10 Cent</option><option value={.01}>1 Cent</option></select></label>
        <label>Personalkosten €/Stunde (optional)<input aria-label="Personalkosten pro Stunde" inputMode="decimal" placeholder="Eigene Vollkosten" value={stundensatz} onChange={e => { setStundensatz(e.target.value); setDirty(true); }} /></label>
      </div>
      <p>Personal, Energie, Gemeinkosten und Gewinn sind Anteile am Netto-Verkaufspreis. Schwund ist ein Zuschlag auf die Rohstoffkosten. Vorgaben mit deiner BWA abgleichen.</p>
      <p>Ohne Arbeitszeit gilt die pauschale Personalquote. Mit Arbeitsminuten je Verkaufseinheit ersetzt der Stundenkostensatz diese Quote vollständig. Erfasst die gesamten anteiligen Personalzeiten einschließlich Vorstufen und Verkauf; keine Gar- oder Backwartezeiten. Der Stundenkostensatz umfasst Arbeitgeberkosten und bezahlte Ausfallzeiten.</p>
      <p>Die vorbelegten Prozentsätze sind Modellannahmen. Ein Schwundzuschlag von 8 % ist keine Retourenquote von 8 %. Energie und Gemeinkosten weiterhin nur einmal ansetzen.</p>
      {!stundensatzOK && <p role="alert">Personalkosten pro Stunde müssen positiv sein oder leer bleiben.</p>}
      <label className="sortiment-check"><input type="checkbox" checked={global} onChange={e => { setGlobal(e.target.checked); setDirty(true); }} /> Diese Zielquoten beim Speichern auch für die Einzelkalkulation übernehmen</label>
      {!quotenOK && <p role="alert">Zielquoten prüfen: Mindestens 5 % Materialanteil müssen übrig bleiben. Alle Felder brauchen gültige Werte.</p>}
    </details>
    <div className="sortiment-summary" aria-live="polite"><span><strong>{rows.length}</strong> Produkte</span><span><strong>{rows.filter(r => !r.fehler.length).length}</strong> berechenbar</span><span><strong>{rows.filter(r => r.fehler.length).length}</strong> mit fehlenden Grundlagen</span></div>
    <div className="sortiment-tools">
      <input type="search" aria-label="Produkt suchen" placeholder="Produkt suchen…" value={suche} onChange={e => setSuche(e.target.value)} />
      <select aria-label="Sortimentskategorie" value={kategorie} onChange={e => setKategorie(e.target.value)}><option value="">Alle Kategorien</option>{[...new Set(rows.map(r => r.kategorie))].sort().map(k => <option key={k}>{k}</option>)}</select>
      <label className="sortiment-check"><input type="checkbox" checked={nurPruefen} onChange={e => setNurPruefen(e.target.checked)} /> Nur Prüfbedarf</label>
    </div>
    <div className="sortiment-tools"><button className="btn" disabled={!quotenOK || !sichtbar.some(r => !r.fehler.length)} onClick={uebernehmen}><Check size={16} /> Sichtbare Vorschläge übernehmen</button>
      <button className="btn" disabled={!sichtbar.length || !eingabenOK} onClick={() => downloadBlob(new Blob([sortimentsCSV(sichtbar)], { type: 'text/csv;charset=utf-8' }), `Preisrunde-${new Date().toISOString().slice(0,10)}.csv`)}><Download size={16} /> Liste für Excel exportieren</button>
    </div>
    <p className="sortiment-help">Preise und Arbeitsminuten gelten je angezeigter Verkaufseinheit. Ohne Schnittzahl wird das ganze Blech berechnet. Ein Wechsel der Schnittzahl leert Preise und Arbeitszeit. „Übernehmen“ setzt die sichtbaren berechenbaren Vorschläge als Entwurfspreise; ein leeres Preisfeld bleibt im Export leer.</p>
    {!eingabenOK && <p role="alert">Eingaben prüfen: Preise und Arbeitszeit müssen gültige positive Zahlen sein; bisherige Preise dürfen auch 0 sein. Stücke pro Blech müssen ganzzahlig sein.</p>}
    <div className="sortiment-table-wrap"><table className="sortiment-table"><thead><tr><th>Produkt / Bezug</th><th>Rohstoffe netto</th><th>Arbeitsminuten je Einheit</th><th>Bisher brutto</th><th>Vorschlag brutto</th><th>Neuer Preis brutto</th><th>Änderung</th></tr></thead><tbody>
      {sichtbar.map(r => <tr key={r.key}>
        <td data-label="Produkt"><strong>{r.name}</strong><span className="sortiment-basis">{r.bezug}</span>
          {r.istBlech && <label className="sortiment-portionen">Stücke/Blech<input aria-label={`Stücke pro Blech: ${r.name}`} disabled={r.basisOffen} inputMode="numeric" placeholder="Ganzes Blech" value={produkte[r.key]?.portionen || ''} onChange={e => update(r.key, 'portionen', e.target.value)} /></label>}
          {r.basisOffen && <div className="sortiment-bezug" role="alert"><p>{produkte[r.key]?.basis ? 'Verkaufseinheit geändert. ' : ''}Preise und Arbeitszeit prüfen: Gelten die gespeicherten Werte für {r.bezug}?</p><button className="btn" onClick={() => bestaetigeBezug(r)}>Bezug bestätigen</button><button className="btn" onClick={() => bestaetigeBezug(r, true)}>Werte leeren</button></div>}
          {r.rechnung && <details className="sortiment-hinweise"><summary>Rechenweg</summary>
            <p>Material inkl. Schwundzuschlag: {de(r.rechnung.rkEff)} € netto.</p>
            <p>{r.minuten == null ? `Nach Abzug aller Zielquoten bleiben ${de(r.rechnung.materialPct)} % für Material.` : `Personalkosten: ${de(r.personalkosten)} € netto. Nach Abzug von Energie, Gemeinkosten und Gewinn bleiben ${de(r.rechnung.materialPct)} % für Material und Personal; die pauschale Personalquote entfällt.`}</p>
            <p>{de(r.rechnung.rkEff + (r.personalkosten ?? 0))} € ÷ {de(r.rechnung.materialPct)} % = {de(r.rechnung.netto)} € netto. Mit {de(params.ustPct)} % USt: {de(r.rechnung.brutto)} €; aufgerundet {de(r.vorgeschlagen)} €.</p>
          </details>}
          {pruefen(r) ? <details className="sortiment-hinweise"><summary><AlertCircle size={14} />{r.fehler.length ? 'Grundlagen fehlen' : r.unterZiel ? 'Unter Kalkulationsziel' : 'Grundlagen prüfen'}</summary>{[...r.fehler, ...r.referenzen.map(n => `${n}: BÄKO-Referenzpreis (03/2026), Einkaufspreis prüfen`), ...r.hinweise, ...(r.unterZiel ? ['Der Entwurfspreis liegt unter dem errechneten Zielpreis.'] : [])].map((s,i) => <p key={i}>{s}</p>)}</details> : <span className="sortiment-basis">Kalkulationsgrundlagen vollständig</span>}
        </td>
        <td data-label="Rohstoffe netto">{de(r.rohstoffe)} €{r.kostenOffen && r.rohstoffe != null ? ' + ?' : ''}</td>
        <td data-label="Arbeitsminuten"><input aria-label={`Arbeitsminuten: ${r.name}`} inputMode="decimal" placeholder="Personalquote" disabled={r.basisOffen} value={produkte[r.key]?.arbeitsminuten ?? ''} onChange={e => update(r.key, 'arbeitsminuten', e.target.value)} /><span className="sortiment-basis">{r.minuten == null ? 'Pauschale Personalquote' : `${de(r.personalkosten)} € Personal netto`}</span></td>
        <td data-label="Bisher brutto"><input aria-label={`Bisheriger Preis: ${r.name}`} inputMode="decimal" disabled={r.basisOffen} placeholder="Optional" value={produkte[r.key]?.alterPreis ?? ''} onChange={e => update(r.key, 'alterPreis', e.target.value)} /></td>
        <td data-label="Vorschlag brutto">{r.fehler.length ? '—' : `${de(r.vorgeschlagen)} €`}</td>
        <td data-label="Neuer Preis brutto"><input aria-label={`Neuer Preis: ${r.name}`} inputMode="decimal" disabled={r.basisOffen} placeholder={r.fehler.length ? 'Grundlagen fehlen' : de(r.vorgeschlagen)} value={produkte[r.key]?.neuerPreis ?? ''} onChange={e => update(r.key, 'neuerPreis', e.target.value)} /></td>
        <td data-label="Änderung">{r.fehler.length || r.differenz == null ? '—' : `${r.differenz > 0 ? '+' : ''}${de(r.differenz)} %`}</td>
      </tr>)}
      {!sichtbar.length && <tr><td colSpan={7}>Keine Produkte für diesen Filter.</td></tr>}
    </tbody></table></div>
    </fieldset>
  </Modal>;
}
