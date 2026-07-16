// LMIV-Block im Admin-Detail (wie renderAllergenNaehrwert der alten App):
// enthaltene Allergene (Pflicht), Spuren (freiwillig), aggregiertes
// Zutatenverzeichnis absteigend nach Anteil, Naehrwerte pro 100g Teig,
// "Kopieren"-Button fuer die Volldeklaration.

import { useState } from 'react';
import { ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getRezeptAllergene, getRezeptSpuren, getRezeptLmivZutaten,
  formatAllergene, berechneNaehrwerte,
} from '../../lib/calc/naehrwerteLookup.js';
import { useToast } from '../../components/Toast.jsx';

export default function LmivBlock({ rezept, customZutaten }) {
  const [offen, setOffen] = useState(false);
  const toast = useToast();

  const allergene = getRezeptAllergene(rezept);
  const spuren = getRezeptSpuren(rezept).filter((s) => !allergene.includes(s));
  const lmivZutaten = getRezeptLmivZutaten(rezept);
  const nw = berechneNaehrwerte(rezept, customZutaten);

  function kopieren() {
    let text = `${rezept.name}\n\nZutaten:\n`;
    lmivZutaten.forEach((z) => {
      text += z.lmiv
        ? `- ${z.name} (${z.bezeichnung}): ${z.lmiv.replace(/<\/?b>/g, '').trim()}\n`
        : `- ${z.name}\n`;
    });
    if (allergene.length) text += `\nEnthaltene Allergene: ${formatAllergene(allergene, true)}\n`;
    if (spuren.length) text += `Kann Spuren enthalten von: ${formatAllergene(spuren, true)}\n`;
    if (nw) {
      text += `\nNährwerte pro 100 g (Teig):\nEnergie ${Math.round(nw.kcal)} kcal · Fett ${nw.fett.toFixed(1)} g (davon ges. FS ${nw.gfs.toFixed(1)} g) · Kohlenhydrate ${nw.kh.toFixed(1)} g (davon Zucker ${nw.zucker.toFixed(1)} g) · Ballaststoffe ${nw.ballaststoffe.toFixed(1)} g · Eiweiß ${nw.eiweiss.toFixed(1)} g · Salz ${nw.salz.toFixed(2)} g\n`;
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success('Volldeklaration kopiert'),
      () => toast.error('Kopieren fehlgeschlagen')
    );
  }

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        className="btn btn-ghost"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}
        onClick={() => setOffen(!offen)}
      >
        <strong>LMIV: Allergene & Nährwerte</strong>
        {offen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {offen && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: 13, color: 'var(--error)' }}>⚠️ Enthaltene Allergene (Pflicht-Kennzeichnung)</strong>
            <div style={{ fontSize: 14 }}>
              {allergene.length ? formatAllergene(allergene, true) : 'Keine erkannt'}
            </div>
          </div>
          {spuren.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 13, color: 'var(--warning)' }}>Spuren (freiwillig, Kreuzkontamination)</strong>
              <div style={{ fontSize: 14 }}>{formatAllergene(spuren, true)}</div>
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Zutatenverzeichnis (absteigend nach Anteil)</strong>
            {lmivZutaten.map((z, i) => (
              <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>{z.name}</span>
                <span className="muted"> ({z.anteil.toFixed(1)}%)</span>
                {z.lmiv && (
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginTop: 2 }}
                    dangerouslySetInnerHTML={{ __html: `${z.bezeichnung}: ${z.lmiv}` }}
                  />
                )}
              </div>
            ))}
          </div>
          {nw && (
            <div style={{ marginBottom: 10, fontSize: 13 }}>
              <strong>Nährwerte pro 100 g Teig</strong>
              {nw.fehlend.length > 0 && (
                <span style={{ color: 'var(--error)' }}> (unvollständig — fehlend: {nw.fehlend.join(', ')})</span>
              )}
              <div className="muted">
                Energie {Math.round(nw.kcal)} kcal · Fett {nw.fett.toFixed(1)} g (ges. FS {nw.gfs.toFixed(1)} g) ·
                KH {nw.kh.toFixed(1)} g (Zucker {nw.zucker.toFixed(1)} g) · Ballaststoffe {nw.ballaststoffe.toFixed(1)} g ·
                Eiweiß {nw.eiweiss.toFixed(1)} g · Salz {nw.salz.toFixed(2)} g
              </div>
            </div>
          )}
          <button className="btn" onClick={kopieren}>
            <ClipboardCopy size={15} /> Volldeklaration kopieren
          </button>
        </div>
      )}
    </div>
  );
}
