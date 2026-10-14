import { useState } from 'react';
import { kochstuecke, pruefeKochwaage } from '../../lib/calc/kochKontrolle.js';

function Kontrolle({ stufe, rezept }) {
  const [ist, setIst] = useState('');
  const [bestaetigt, setBestaetigt] = useState(false);
  const [fehler, setFehler] = useState('');
  const netto = ist.trim() === '' ? null : Number(ist.replace(',', '.')) / 1000;
  const result = netto == null ? null : pruefeKochwaage(stufe, netto);
  function dokumentieren() {
    try {
      const key = 'rz2_kochprotokoll';
      const alt = JSON.parse(localStorage.getItem(key) || '[]');
      const eintrag = { zeit: new Date().toISOString(), rezeptId: rezept.id, version: rezept._version,
        stufe: stufe.name, sollKg: stufe.sollKg, abgekuehltKg: netto, ausgleichKg: result.wasserNachfuellenKg };
      localStorage.setItem(key, JSON.stringify([eintrag, ...(Array.isArray(alt) ? alt : [])].slice(0, 100)));
      setBestaetigt(true);
    } catch { setFehler('Protokoll konnte auf diesem Gerät nicht gespeichert werden.'); }
  }
  return <div style={{ margin: '12px 0' }}>
    <strong>{stufe.name}: Sollgewicht {(stufe.sollKg * 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} g</strong>
    <p>Nach dem Abkühlen ohne Gefäß wiegen und verdampftes Wasser bis zum Sollgewicht ergänzen. Die Rezept-TA setzt diesen Ausgleich voraus.</p>
    <label>Abgekühltes Nettogewicht (g)<input aria-label={`${stufe.name}: abgekühltes Nettogewicht (g)`} inputMode="decimal" value={ist} disabled={bestaetigt} onChange={e => setIst(e.target.value)} /></label>
    {result?.status === 'korrekt' && <p>Ausgleichswasser: <strong>{(result.wasserNachfuellenKg * 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} g</strong>. Bereits in der Soll-Rezeptur enthalten, nicht zusätzlich zum Schüttwasser rechnen.</p>}
    {result?.fehler && <p role="alert">{result.fehler}</p>}
    {fehler && <p role="alert">{fehler}</p>}
    {bestaetigt ? <p role="status">Auf Sollgewicht ausgeglichen · auf diesem Gerät dokumentiert. <button className="btn" onClick={() => { setIst(''); setBestaetigt(false); }}>Neue Charge</button></p> : <button className="btn" disabled={result?.status !== 'korrekt'} onClick={dokumentieren}>Ausgleich durchgeführt – dokumentieren</button>}
  </div>;
}
export default function KochstueckKontrolle({ rezept, sk }) {
  const stufen = kochstuecke(rezept, sk);
  if (!stufen.length) return null;
  return <details className="baker-section" style={{ padding: 12, marginBottom: 12 }}>
    <summary><strong>Kochstück: Rückwaage und Wasserausgleich</strong></summary>
    {stufen.map(s => <Kontrolle key={`${rezept.id}:${rezept._version}:${s.name}:${s.sollKg}`} stufe={s} rezept={rezept} />)}
  </details>;
}
