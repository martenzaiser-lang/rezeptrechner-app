// Zutat-Editor: Name (mit Vorschlaegen), Menge in g oder Dosen-Modus,
// Arbeitsschritt-Toggle, Mehl-/Wasser-Flags, Abschnitts-Chips + freier
// Abschnitt, Menge pro Presse, Produkt-Zuordnung + Zusatz-% —
// Felder wie alte App (#m-zutat).

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';

const SECTIONS = ['Hauptteig', 'Quellstück', 'Kochstück', 'Sauerteig', 'Vorteig', 'Brühstück', 'Früchte'];

export default function ZutatEditorModal({ zutat, rezept, vorschlaege, onSave, onClose }) {
  const isNew = !zutat;
  const z = zutat || {};
  const bem = z.bemerkung || '';
  const bekannteSektion = SECTIONS.find((s) => bem.toLowerCase().includes(s.toLowerCase().slice(0, 5)));

  const [name, setName] = useState(z.name || '');
  // Dezimalgramm erhalten (z.B. 16,5 g) — Math.round würde sie beim
  // erneuten Öffnen des Editors verwerfen
  const [mengeG, setMengeG] = useState(z.menge_kg ? String(+(z.menge_kg * 1000).toFixed(2)) : '');
  const [istKommentar, setIstKommentar] = useState(!!z.ist_kommentar);
  const [istMehl, setIstMehl] = useState(!!z.ist_mehl);
  const [istWasser, setIstWasser] = useState(!!z.ist_wasser);
  const [sektion, setSektion] = useState(bekannteSektion || (bem ? '' : 'Hauptteig'));
  const [freiAbschnitt, setFreiAbschnitt] = useState(bekannteSektion ? '' : bem);
  const [dosenModus, setDosenModus] = useState(z.einheit === 'dose' && z.dosen_gewicht_g > 0);
  const [dosenAnzahl, setDosenAnzahl] = useState(
    z.einheit === 'dose' && z.dosen_gewicht_g > 0
      ? String(Math.round((z.menge_kg * 1000 / z.dosen_gewicht_g) * 100) / 100)
      : ''
  );
  const [dosenGewicht, setDosenGewicht] = useState(z.dosen_gewicht_g ? String(z.dosen_gewicht_g) : '');
  const [prosPresse, setProsPresse] = useState(z.menge_pro_presse ? String(z.menge_pro_presse) : '');
  const [nichtAufBon, setNichtAufBon] = useState(!!z.nicht_auf_bon);
  const [fuerProdukte, setFuerProdukte] = useState(z.fuer_produkte || []);
  const [zusatzProzent, setZusatzProzent] = useState(z.zusatz_prozent ? String(z.zusatz_prozent) : '');
  const [zeigeVorschlaege, setZeigeVorschlaege] = useState(false);

  const hatProdukte = rezept.produkte && rezept.produkte.length > 1;
  const passende = zeigeVorschlaege && name.length >= 2
    ? vorschlaege.filter((v) => v.name.toLowerCase().includes(name.toLowerCase())).slice(0, 8)
    : [];

  function speichern() {
    if (!name.trim()) return;
    const neu = {
      name: name.trim(),
      ist_kommentar: istKommentar,
      ist_mehl: istKommentar ? false : istMehl,
      ist_wasser: istKommentar ? false : istWasser,
      bemerkung: istKommentar ? (z.bemerkung || '') : (freiAbschnitt.trim() || (sektion === 'Hauptteig' ? '' : sektion)),
      fuer_produkte: fuerProdukte,
      zusatz_prozent: parseFloat(zusatzProzent) || 0,
      menge_pro_presse: parseFloat(prosPresse) || 0,
      nicht_auf_bon: nichtAufBon,
      einheit: dosenModus ? 'dose' : '',
      dosen_gewicht_g: dosenModus ? (parseFloat(dosenGewicht) || 0) : 0,
      menge_kg: 0,
    };
    if (!istKommentar) {
      if (dosenModus) {
        const anz = parseFloat(String(dosenAnzahl).replace(',', '.')) || 0;
        const gew = parseFloat(dosenGewicht) || 0;
        neu.menge_kg = +((anz * gew) / 1000).toFixed(6);
      } else {
        neu.menge_kg = +((parseFloat(String(mengeG).replace(',', '.')) || 0) / 1000).toFixed(6);
      }
    }
    onSave(neu);
  }

  const dosenSummeG = (parseFloat(String(dosenAnzahl).replace(',', '.')) || 0) * (parseFloat(dosenGewicht) || 0);

  return (
    <Modal
      title={isNew ? 'Zutat hinzufügen' : 'Zutat bearbeiten'}
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern}>Speichern</button>
        </>
      }
    >
      <label className="chk-row" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input type="checkbox" checked={istKommentar} onChange={(e) => setIstKommentar(e.target.checked)} />
        <span>📝 Hinweis / Arbeitsschritt (kein Zutaten-Eintrag)</span>
      </label>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <label>{istKommentar ? 'Hinweistext' : 'Name'}</label>
        <input
          value={name}
          autoFocus
          placeholder={istKommentar ? 'z.B. 30 min ruhen lassen' : 'z.B. Weizenmehl 550'}
          onChange={(e) => { setName(e.target.value); setZeigeVorschlaege(true); }}
          onBlur={() => setTimeout(() => setZeigeVorschlaege(false), 250)}
          style={{ width: '100%' }}
        />
        {!istKommentar && passende.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'var(--bg-elevated, #fff)', border: '1px solid var(--border-strong)',
            borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto',
          }}>
            {passende.map((v) => (
              <button
                key={v.name}
                className="btn btn-ghost"
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => { setName(v.name); setIstMehl(v.ist_mehl); setIstWasser(v.ist_wasser); setZeigeVorschlaege(false); }}
              >
                {v.name} {v.ist_mehl ? '· Mehl' : ''}{v.ist_wasser ? '· Wasser' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {!istKommentar && (
        <>
          {!dosenModus ? (
            <div style={{ marginBottom: 10 }}>
              <label>
                Menge (g){' '}
                <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setDosenModus(true)}>
                  Dosen-Eingabe
                </button>
              </label>
              <input type="number" step="any" min="0" value={mengeG} onChange={(e) => setMengeG(e.target.value)} style={{ width: '100%' }} />
            </div>
          ) : (
            <div style={{ marginBottom: 10, padding: 12, background: 'var(--accent-light)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Dosen-Eingabe</strong>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setDosenModus(false)}>
                  Zurück zu Gramm
                </button>
              </div>
              <div className="form-grid-2" style={{ marginBottom: 0 }}>
                <div>
                  <label style={{ fontSize: 12 }}>Anzahl Dosen</label>
                  <input type="number" step="0.1" min="0" value={dosenAnzahl} onChange={(e) => setDosenAnzahl(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>Gewicht / Dose (g)</label>
                  <input type="number" step="any" min="1" value={dosenGewicht} onChange={(e) => setDosenGewicht(e.target.value)} style={{ width: '100%' }} />
                </div>
              </div>
              {dosenSummeG > 0 && (
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
                  = {Math.round(dosenSummeG).toLocaleString('de-DE')} g gesamt
                </div>
              )}
            </div>
          )}

          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" checked={nichtAufBon} onChange={(e) => setNichtAufBon(e.target.checked)} />
            <span>🚫 Nicht auf Bon drucken (z.B. vorgewogenes Backmittel)</span>
          </label>
          <div className="form-grid-2">
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={istMehl} onChange={(e) => setIstMehl(e.target.checked)} />
              <span>Mehlanteil (TA-Basis)</span>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={istWasser} onChange={(e) => setIstWasser(e.target.checked)} />
              <span>Wasseranteil (TA)</span>
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Abschnitt (Teigbestandteil)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {SECTIONS.map((s) => (
                <label
                  key={s}
                  style={{
                    display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 12px',
                    borderRadius: 8, cursor: 'pointer',
                    background: sektion === s && !freiAbschnitt ? 'var(--accent-light)' : 'var(--bg-subtle)',
                    border: `1px solid ${sektion === s && !freiAbschnitt ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="sektion"
                    checked={sektion === s && !freiAbschnitt}
                    onChange={() => { setSektion(s); setFreiAbschnitt(''); }}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)' }}>Oder freier Abschnitt (z.B. Teig, Füllung, Glasur)</label>
              <input
                value={freiAbschnitt}
                placeholder="z.B. Füllung, Glasur, Creme…"
                onChange={(e) => setFreiAbschnitt(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10, padding: 12, background: 'var(--bg-subtle)', borderRadius: 10 }}>
            <label>Menge pro Presse (kg) – optional</label>
            <input type="number" step="0.1" min="0" value={prosPresse} onChange={(e) => setProsPresse(e.target.value)} style={{ width: '100%' }} placeholder="leer = normale Skalierung" />
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>💡 Bei 1 kg und 3 Pressen → 3 kg</p>
          </div>

          {hatProdukte && (
            <div style={{ marginBottom: 10 }}>
              <label>Nur für bestimmte Produkte (leer = alle)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {rezept.produkte.map((p) => (
                  <label key={p.name} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 12px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={fuerProdukte.includes(p.name)}
                      onChange={(e) =>
                        setFuerProdukte(
                          e.target.checked ? [...fuerProdukte, p.name] : fuerProdukte.filter((n) => n !== p.name)
                        )
                      }
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label>Zusatz: % vom Teig (optional, statt fester Menge)</label>
            <input type="number" step="0.1" min="0" max="200" value={zusatzProzent} onChange={(e) => setZusatzProzent(e.target.value)} style={{ width: '100%' }} placeholder="z.B. 20 für 20% Rosinen" />
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>
              💡 Nur wirksam, wenn keine feste Menge (g) gesetzt ist.
            </p>
          </div>
        </>
      )}
    </Modal>
  );
}
