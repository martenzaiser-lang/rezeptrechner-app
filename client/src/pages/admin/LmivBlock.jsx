// LMIV-Block im Admin-Detail (wie renderAllergenNaehrwert der alten App):
// enthaltene Allergene (Pflicht), Spuren (freiwillig), aggregiertes
// Zutatenverzeichnis absteigend nach Anteil, Naehrwerte pro 100g Teig,
// "Kopieren"-Button fuer die Volldeklaration.

import { useState } from 'react';
import { ClipboardCopy, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getRezeptAllergene, getRezeptSpuren, getRezeptLmivZutaten,
  formatAllergene, getRezeptAllergenStatus,
} from '../../lib/calc/naehrwerteLookup.js';
import { useToast } from '../../components/Toast.jsx';
import { produktRezept } from '../../lib/calc/produktion.js';
import { produktNaehrwerte } from '../../lib/calc/produktNaehrwerte.js';
import { formatNaehrwert as fmt } from '../../lib/calc/naehrwertFelder.js';
import NaehrwertDruck from './NaehrwertDruck.jsx';

export default function LmivBlock({ rezept: grundrezept, customZutaten }) {
  const [offen, setOffen] = useState(false);
  const [auswahl, setAuswahl] = useState('');
  const produktName = grundrezept.produkte?.some(p => p.name === auswahl) ? auswahl : grundrezept.produkte?.[0]?.name;
  const rezept = produktRezept(grundrezept, produktName);
  const toast = useToast();

  const allergene = getRezeptAllergene(rezept, customZutaten);
  const allergenStatus = getRezeptAllergenStatus(rezept, customZutaten);
  const spuren = getRezeptSpuren(rezept, customZutaten).filter((s) => !allergene.includes(s));
  const lmivZutaten = getRezeptLmivZutaten(rezept, customZutaten);

  const profil = produktNaehrwerte(rezept, customZutaten);
  const nw = profil.werte ? { ...profil.werte, fehlend: profil.fehlend } : null;
  const bezug = profil.bezug;

  function kopieren() {
    let text = `${rezept.name}\n\nZutaten:\n`;
    lmivZutaten.forEach((z) => {
      text += z.lmiv
        ? `- ${z.name} (${z.bezeichnung}): ${z.lmiv.replace(/<\/?b>/g, '').trim()}\n`
        : `- ${z.name}\n`;
    });
    if (allergene.length) text += `\nEnthaltene Allergene: ${formatAllergene(allergene, true)}\n`;
    if (spuren.length) text += `Kann Spuren enthalten von: ${formatAllergene(spuren, true)}\n`;
    if (nw && nw.fehlend.length === 0) {
      text += `\nNährwerte ${bezug}:\nEnergie ${Math.round(nw.kj)} kJ / ${Math.round(nw.kcal)} kcal · Fett ${fmt(nw.fett, 1)} g (davon ges. FS ${fmt(nw.gfs, 1)} g) · Kohlenhydrate ${fmt(nw.kh, 1)} g (davon Zucker ${fmt(nw.zucker, 1)} g)${nw.ballaststoffe == null ? '' : ` · Ballaststoffe ${fmt(nw.ballaststoffe, 1)} g`} · Eiweiß ${fmt(nw.eiweiss, 1)} g · Salz ${fmt(nw.salz, 2)} g\n`;
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
          {grundrezept.produkte?.length > 1 && <label style={{ display: 'block', marginBottom: 12 }}>
            Produkt für Nährwerte und Deklaration
            <select aria-label="Produkt für Nährwerte" value={produktName} onChange={e => setAuswahl(e.target.value)} style={{ width: '100%' }}>
              {grundrezept.produkte.map(p => <option key={p.name}>{p.name}</option>)}
            </select>
          </label>}
          <NaehrwertDruck rezept={rezept} customZutaten={customZutaten} />
          {!allergenStatus.vollstaendig && <p style={{ color: 'var(--error)' }}>
            Allergenangaben unvollständig — {rezept.berechnungsfehler || `Zutaten prüfen: ${allergenStatus.fehlend.join(', ') || 'keine Zutatenmenge'}`}
          </p>}
          <div style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: 13, color: 'var(--error)' }}>⚠️ Enthaltene Allergene (Pflicht-Kennzeichnung)</strong>
            <div style={{ fontSize: 14 }}>
              {allergene.length ? formatAllergene(allergene, true) : allergenStatus.vollstaendig ? 'Keine kennzeichnungspflichtigen Allergene enthalten' : 'Keine bestätigte vollständige Angabe vorhanden'}
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
                <span className="muted"> ({fmt(z.anteil)} %)</span>
                {z.lmiv && (
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginTop: 2 }}
                    children={`${z.bezeichnung || z.name}: ${z.lmiv.replace(/<[^>]*>/g, '')}`}
                  />
                )}
              </div>
            ))}
          </div>
          {nw && (
            <div style={{ marginBottom: 10, fontSize: 13 }}>
              <strong>Nährwerte {bezug}</strong>
              {!['gemessen', 'geschaetzt'].includes(rezept.backverlust_status) && (
                <span style={{ color: 'var(--warning)' }}>
                  {' '}— Gemessenen Backverlust in den Stammdaten eintragen, um Werte für das fertige Produkt zu erhalten.
                </span>
              )}
              {nw.fehlend.length > 0 && (
                <span style={{ color: 'var(--error)' }}> (unvollständig — fehlend: {nw.fehlend.join(', ')})</span>
              )}
              {profil.fehlendeFelder.length > 0 && <ul>{profil.fehlendeFelder.map((d, i) => <li key={i}>
                {d.name}: {d.quelleOffen ? 'Produktzuordnung / Quelle ungeprüft. ' : ''}{d.felder.length ? `Fehlend: ${d.felder.join(', ')}` : ''}
              </li>)}</ul>}
              {profil.vollstaendig && <div className="muted">
                Energie {Math.round(nw.kj)} kJ / {Math.round(nw.kcal)} kcal · Fett {fmt(nw.fett, 1)} g (ges. FS {fmt(nw.gfs, 1)} g) ·
                Kohlenhydrate {fmt(nw.kh, 1)} g (Zucker {fmt(nw.zucker, 1)} g) · {nw.ballaststoffe != null && <>Ballaststoffe {fmt(nw.ballaststoffe, 1)} g · </>}
                Eiweiß {fmt(nw.eiweiss, 1)} g · Salz {fmt(nw.salz, 2)} g
              </div>}
            </div>
          )}
          <button className="btn" onClick={kopieren} disabled={!allergenStatus.vollstaendig || !!rezept.berechnungsfehler}>
            <ClipboardCopy size={15} /> Volldeklaration kopieren
          </button>
        </div>
      )}
    </div>
  );
}
