import { useMemo, useState } from 'react';
import { Download, Check, AlertCircle } from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { KALKULATION_DEFAULTS } from '../../lib/kalkulation.js';
import { sortimentsKalkulation, sortimentsCSV, preisZahl } from '../../lib/sortimentskalkulation.js';
import { downloadBlob } from '../../lib/download.js';
import '../../styles/sortiment.css';

const FELDER = [['schwundPct', 'Schwundzuschlag %'], ['personalPct', 'Personal %'], ['energiePct', 'Energie %'], ['gemeinkostenPct', 'Gemeinkosten %'], ['gewinnPct', 'Gewinn %'], ['ustPct', 'USt %']];
const de = n => Number.isFinite(n) ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export default function SortimentsKalkulationModal({ recipes, prices, settings, onClose, onSave }) {
  const saved = settings?.sortimentskalkulation || {};
  const [parameter, setParameter] = useState(() => Object.fromEntries(Object.entries({ ...KALKULATION_DEFAULTS, ...settings?.kalkulation, ...saved.parameter }).map(([k,v]) => [k, String(v).replace('.', ',')])));
  const [produkte, setProdukte] = useState(saved.produkte || {});
  const [rundung, setRundung] = useState(saved.rundung || .05);
  const [suche, setSuche] = useState(''), [kategorie, setKategorie] = useState(''), [nurPruefen, setNurPruefen] = useState(false);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [global, setGlobal] = useState(false);
  const confirm = useConfirm();
  const params = useMemo(() => Object.fromEntries(FELDER.map(([k]) => [k, preisZahl(parameter[k]) ?? NaN])), [parameter]);
  const rows = useMemo(() => sortimentsKalkulation(recipes, prices, params, produkte, rundung).sort((a,b) => a.name.localeCompare(b.name, 'de')), [recipes, prices, params, produkte, rundung]);
  const pruefen = r => r.fehler.length || r.referenzen.length || r.hinweise.length || r.unterZiel;
  const sichtbar = rows.filter(r => (!suche || r.name.toLowerCase().includes(suche.toLowerCase())) && (!kategorie || r.kategorie === kategorie) && (!nurPruefen || pruefen(r)));
  const quotenOK = FELDER.every(([k]) => Number.isFinite(params[k]) && params[k] >= 0 && params[k] <= 100) && params.personalPct + params.energiePct + params.gemeinkostenPct + params.gewinnPct <= 95;
  const eingabenOK = Object.values(produkte).every(d => ['alterPreis', 'neuerPreis', 'portionen'].every(k => d[k] == null || d[k] === '' || Number.isFinite(preisZahl(d[k])) && (k === 'alterPreis' ? preisZahl(d[k]) >= 0 : preisZahl(d[k]) > 0) && (k !== 'portionen' || Number.isInteger(preisZahl(d[k])))));
  function update(key, field, value) {
    setProdukte(prev => ({ ...prev, [key]: { ...prev[key], ...(field === 'portionen' ? { alterPreis: '', neuerPreis: '' } : {}), [field]: value } })); setDirty(true);
  }
  async function schliessen() {
    if (!dirty || await confirm({ title: 'Preisrunde schließen', message: 'Ungespeicherte Änderungen an diesem Entwurf verwerfen?', confirmText: 'Verwerfen' })) onClose();
  }
  function uebernehmen() {
    setProdukte(prev => {
      const next = { ...prev };
      for (const r of sichtbar) if (!r.fehler.length) next[r.key] = { ...next[r.key], neuerPreis: de(r.vorgeschlagen).replace(/\./g, '') };
      return next;
    }); setDirty(true);
  }
  async function speichern() {
    setBusy(true);
    try { await onSave({ sortimentskalkulation: { schemaVersion: 1, parameter: params, produkte, rundung, stand: new Date().toISOString() }, ...(global ? { kalkulation: params } : {}) }); }
    finally { setBusy(false); }
  }
  return <Modal title="Sortiment kalkulieren" maxWidth={1240} onClose={busy ? () => {} : schliessen} footer={<>
    <span className="sortiment-save-note" role="status">{dirty ? 'Entwurf geändert' : saved.stand ? `Entwurf vom ${new Date(saved.stand).toLocaleDateString('de-DE')}` : 'Neue Preisrunde'}</span>
    <button className="btn" disabled={busy} onClick={schliessen}>Schließen</button>
    <button className="btn btn-primary" disabled={busy || !quotenOK || !eingabenOK} onClick={speichern}>{busy ? 'Speichert…' : 'Entwurf speichern'}</button>
  </>}>
    <div className="sortiment-intro"><p>1. Einkaufspreise pflegen · 2. Zielquoten prüfen · 3. Preise vergleichen und exportieren</p>
      <p>Alle aktiven Produkte, einschließlich Varianten. Vorschläge aus den aktuellen Rezepten und Rohstoffpreisen; die Preisrunde bleibt ein Entwurf.</p></div>
    <details className="sortiment-quoten" open={!saved.stand}>
      <summary>Betriebskosten und Rundung</summary>
      <div className="sortiment-parameter">{FELDER.map(([key,label]) => <label key={key}>{label}<input aria-label={label} inputMode="decimal" value={parameter[key]} onChange={e => { setParameter({ ...parameter, [key]: e.target.value }); setDirty(true); }} /></label>)}
        <label>Aufrunden auf<select aria-label="Preisrundung" value={rundung} onChange={e => { setRundung(Number(e.target.value)); setDirty(true); }}><option value={.05}>5 Cent</option><option value={.1}>10 Cent</option><option value={.01}>1 Cent</option></select></label>
      </div>
      <p>Personal, Energie, Gemeinkosten und Gewinn sind Anteile am Netto-Verkaufspreis. Schwund ist ein Zuschlag auf die Rohstoffkosten. Vorgaben mit deiner BWA abgleichen.</p>
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
    <p className="sortiment-help">Bisherige und neue Preise sind brutto je angezeigter Einheit. Bei Blechkuchen Stückzahl pro Blech eintragen; ein Wechsel des Stückbezugs leert die zugehörigen Preise. „Übernehmen“ ersetzt die Entwurfspreise der sichtbaren berechenbaren Produkte.</p>
    <div className="sortiment-table-wrap"><table className="sortiment-table"><thead><tr><th>Produkt / Bezug</th><th>Rohstoffe netto</th><th>Bisher brutto</th><th>Vorschlag brutto</th><th>Neuer Preis brutto</th><th>Änderung</th></tr></thead><tbody>
      {sichtbar.map(r => <tr key={r.key}>
        <td data-label="Produkt"><strong>{r.name}</strong><span className="sortiment-basis">{r.bezug}</span>
          {r.istBlech && <label className="sortiment-portionen">Stücke/Blech<input aria-label={`Stücke pro Blech: ${r.name}`} inputMode="numeric" placeholder="Ganzes Blech" value={produkte[r.key]?.portionen || ''} onChange={e => update(r.key, 'portionen', e.target.value)} /></label>}
          {pruefen(r) ? <details className="sortiment-hinweise"><summary><AlertCircle size={14} />{r.fehler.length ? 'Grundlagen fehlen' : r.unterZiel ? 'Unter Kalkulationsziel' : 'Grundlagen prüfen'}</summary>{[...r.fehler, ...r.referenzen.map(n => `${n}: BÄKO-Referenzpreis (03/2026), Einkaufspreis prüfen`), ...r.hinweise, ...(r.unterZiel ? ['Der Entwurfspreis liegt unter dem errechneten Zielpreis.'] : [])].map((s,i) => <p key={i}>{s}</p>)}</details> : <span className="sortiment-basis">Kalkulationsgrundlagen vollständig</span>}
        </td>
        <td data-label="Rohstoffe netto">{de(r.rohstoffe)} €{r.fehler.length ? ' + ?' : ''}</td>
        <td data-label="Bisher brutto"><input aria-label={`Bisheriger Preis: ${r.name}`} inputMode="decimal" placeholder="Optional" value={produkte[r.key]?.alterPreis ?? ''} onChange={e => update(r.key, 'alterPreis', e.target.value)} /></td>
        <td data-label="Vorschlag brutto">{r.fehler.length ? '—' : `${de(r.vorgeschlagen)} €`}</td>
        <td data-label="Neuer Preis brutto"><input aria-label={`Neuer Preis: ${r.name}`} inputMode="decimal" placeholder={r.fehler.length ? 'Grundlagen fehlen' : de(r.vorgeschlagen)} value={produkte[r.key]?.neuerPreis ?? ''} onChange={e => update(r.key, 'neuerPreis', e.target.value)} /></td>
        <td data-label="Änderung">{r.fehler.length || r.differenz == null ? '—' : `${r.differenz > 0 ? '+' : ''}${de(r.differenz)} %`}</td>
      </tr>)}
      {!sichtbar.length && <tr><td colSpan={6}>Keine Produkte für diesen Filter.</td></tr>}
    </tbody></table></div>
  </Modal>;
}
