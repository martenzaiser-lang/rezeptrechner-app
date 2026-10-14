// Produktionsplanung: Stueckzahlen ueber mehrere Rezepte → Rohstoffbedarf
// (Teige, Koerner/Quellstueck, Sauerteig, Mehle) — wie alte App (#m-planung).

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { berechnePlanung } from '../../lib/calc/planung.js';
import { getSorted } from '../../lib/rezeptFilter.js';
import MengenSteuerung from './MengenSteuerung.jsx';
import { berechneBaker } from '../../lib/calc/bakerBerechnung.js';

export default function PlanungModal({ recipes, onClose }) {
  const sorted = getSorted(recipes, true);
  const [stueck, setStueck] = useState({});
  const [result, setResult] = useState(null);

  const set = (id, v) => { setStueck({ ...stueck, [id]: v }); setResult(null); };

  function berechnen() {
    const r = berechnePlanung(recipes, stueck);
    setResult(r);
  }

  const fmtKg = (kg) => `${kg.toFixed(3).replace('.', ',')} kg`;
  const fmtG = (kg) => `${Math.round(kg * 1000).toLocaleString('de-DE')} g`;

  return (
    <Modal
      title="📋 Produktionsplanung"
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => { setStueck({}); setResult(null); }}>Zurücksetzen</button>
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
          <button className="btn btn-primary" onClick={berechnen}>Berechnen</button>
        </>
      }
    >
      <div style={{ maxHeight: '38vh', overflowY: 'auto', marginBottom: 12 }}>
        {sorted.map(r => {
          const e = stueck[r.id] || { stueck: 0, blechN: 0, blechB: r.blech_breite_cm || 50, blechL: r.blech_laenge_cm || 80, produktStueck: {}, faktor: 1 };
          return <details key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <summary><strong>{r.name}</strong></summary>
            <MengenSteuerung rezept={r} eingabe={e} onChange={v => set(r.id,v)} ergebnis={berechneBaker(r,e)} />
          </details>;
        })}
      </div>

      {result && (
        <div>
          {result.fehler.map(f => <p key={f} role="alert">{f}</p>)}
          <div className="teig-box" style={{ width: '100%', marginBottom: 12 }}>
            <div className="teig-lbl">Gesamtproduktion ({result.teige.length} Rezepte)</div>
            <div className="teig-val">{result.totalTeig.toFixed(2).replace('.', ',')} kg</div>
          </div>
          <h3 style={{ fontSize: 14 }}>🍞 Teige</h3>
          {result.teige.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span>{t.name} <span className="muted">({t.mengeText})</span></span>
              <strong>{fmtKg(t.gewicht)}</strong>
            </div>
          ))}
          {Object.keys(result.koerner).length > 0 && (
            <>
              <h3 style={{ fontSize: 14 }}>🌾 Körner/Quellstück gesamt</h3>
              {Object.entries(result.koerner).sort((a, b) => b[1] - a[1]).map(([n, m]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                  <span>{n}</span><strong>{fmtG(m)}</strong>
                </div>
              ))}
            </>
          )}
          {Object.keys(result.sauerteig).length > 0 && (
            <>
              <h3 style={{ fontSize: 14 }}>🥖 Sauerteig gesamt</h3>
              {Object.entries(result.sauerteig).sort((a, b) => b[1] - a[1]).map(([n, m]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                  <span>{n}</span><strong>{fmtG(m)}</strong>
                </div>
              ))}
            </>
          )}
          {(() => {
            const mehle = Object.entries(result.zutaten).filter(([, z]) => z.ist_mehl).sort((a, b) => b[1].menge - a[1].menge);
            if (!mehle.length) return null;
            const mTotal = result.gesamtMehl;
            return (
              <>
                <h3 style={{ fontSize: 14 }}>🌾 Mehle gesamt</h3>
                {mehle.map(([n, z]) => (
                  <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                    <span>{n}</span><strong>{fmtKg(z.menge)}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                  <span>Gesamtmehl einschließlich Vorstufen</span><span>{mTotal == null ? 'Vorstufenanteile fehlen' : fmtKg(mTotal)}</span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </Modal>
  );
}
