// Zutat-Editor: Name (mit Vorschlaegen), Menge in g oder Dosen-Modus,
// Arbeitsschritt-Toggle, Mehl-/Wasser-Flags, Abschnitts-Chips + freier
// Abschnitt, Menge pro Presse, Produkt-Zuordnung + Zusatz-% —
// Felder wie alte App (#m-zutat).

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';

const SECTIONS = ['Hauptteig', 'Quellstück', 'Kochstück', 'Sauerteig', 'Vorteig', 'Brühstück', 'Früchte'];

// Dezimal-Eingabe: type="number" verwirft je nach Browser-Sprache das
// Komma (React erhält dann '' statt des Werts) — deshalb Textfelder mit
// Dezimal-Tastatur (inputMode) und eigener Umwandlung Komma → Punkt.
const dezimal = (s) => parseFloat(String(s).replace(',', '.')) || 0;
// erlaubt Ziffern mit optional EINEM Komma/Punkt (auch unvollständig wie "16,")
const dezimalOk = (s) => /^\d*[.,]?\d*$/.test(s);

export default function ZutatEditorModal({ zutat, rezept, vorschlaege, onSave, onClose }) {
  const isNew = !zutat;
  const z = zutat || {};
  const bem = z.bemerkung || '';
  const bekannteSektion = SECTIONS.find((s) => bem.toLowerCase().includes(s.toLowerCase().slice(0, 5)));

  const [name, setName] = useState(z.name || '');
  // Dezimalgramm erhalten (z.B. 16,5 g) — Math.round würde sie beim
  // erneuten Öffnen des Editors verwerfen; Anzeige im de-Format (Komma)
  const [mengeG, setMengeG] = useState(z.menge_kg ? String(+(z.menge_kg * 1000).toFixed(2)).replace('.', ',') : '');
  const [istKommentar, setIstKommentar] = useState(!!z.ist_kommentar);
  const [mengenModus, setMengenModus] = useState(z.menge_pro_presse > 0 ? 'presse' : z.menge_kg > 0 ? 'gewicht' : z.zusatz_prozent > 0 ? 'prozent' : 'gewicht');
  const [istMehl, setIstMehl] = useState(!!z.ist_mehl);
  const [istWasser, setIstWasser] = useState(!!z.ist_wasser);
  const [sektion, setSektion] = useState(bekannteSektion || (bem ? '' : 'Hauptteig'));
  const [freiAbschnitt, setFreiAbschnitt] = useState(bekannteSektion ? '' : bem);
  const [dosenModus, setDosenModus] = useState(z.einheit === 'dose' && z.dosen_gewicht_g > 0);
  const [dosenAnzahl, setDosenAnzahl] = useState(
    z.einheit === 'dose' && z.dosen_gewicht_g > 0
      ? String(Math.round((z.menge_kg * 1000 / z.dosen_gewicht_g) * 100) / 100).replace('.', ',')
      : ''
  );
  const [dosenGewicht, setDosenGewicht] = useState(z.dosen_gewicht_g ? String(z.dosen_gewicht_g).replace('.', ',') : '');
  const [prosPresse, setProsPresse] = useState(z.menge_pro_presse ? String(z.menge_pro_presse).replace('.', ',') : '');
  const [nichtAufBon, setNichtAufBon] = useState(!!z.nicht_auf_bon);
  const [fuerProdukte, setFuerProdukte] = useState(z.fuer_produkte || []);
  const [zusatzProzent, setZusatzProzent] = useState(z.zusatz_prozent ? String(z.zusatz_prozent).replace('.', ',') : '');
  const [prozentBezug, setProzentBezug] = useState(z.prozent_bezug || 'mehl');
  const [zeigeVorschlaege, setZeigeVorschlaege] = useState(false);
  const [taRolle, setTaRolle] = useState(z.ta_rolle || (z.ta_anteile || z.ta_pro_kg || z.vorstufe_nur_mehl_wasser ? 'vorstufe' : z.ist_mehl ? 'mehl' : z.ist_wasser ? 'fluessigkeit' : ''));
  const vorstufenBasisKg = mengenModus === 'gewicht' ? z.menge_kg : 1;
  const vorstufenMehl = z.vorstufe_nur_mehl_wasser && z.vorstufe_ta >= 100 ? vorstufenBasisKg * 100 / z.vorstufe_ta : null;
  const [mehlAnteil, setMehlAnteil] = useState(z.ta_anteile || z.ta_pro_kg || vorstufenMehl != null ? String((z.ta_pro_kg ? z.ta_pro_kg.mehl_kg * (mengenModus === 'gewicht' ? z.menge_kg : 1) : z.ta_anteile?.mehl_kg ?? vorstufenMehl) * 1000).replace('.', ',') : '');
  const [wasserAnteil, setWasserAnteil] = useState(z.ta_anteile || z.ta_pro_kg || vorstufenMehl != null ? String((z.ta_pro_kg ? z.ta_pro_kg.fluessigkeit_kg * vorstufenBasisKg : z.ta_anteile?.fluessigkeit_kg ?? vorstufenBasisKg - vorstufenMehl) * 1000).replace('.', ',') : '');
  const [fehler, setFehler] = useState('');
  const [taNaeherung, setTaNaeherung] = useState(!!z.ta_naeherung);
  const [taHinweis, setTaHinweis] = useState(z.ta_hinweis || '');

  const hatProdukte = rezept.produkte && rezept.produkte.length > 1;
  const passende = zeigeVorschlaege && name.length >= 2
    ? vorschlaege.filter((v) => v.name.toLowerCase().includes(name.toLowerCase())).slice(0, 8)
    : [];

  function speichern() {
    if (!name.trim()) return;
    const neu = {
      ...z,
      name: name.trim(),
      ist_kommentar: istKommentar,
      ist_mehl: istKommentar ? false : istMehl,
      ist_wasser: istKommentar ? false : istWasser,
      bemerkung: istKommentar ? (z.bemerkung || '') : (freiAbschnitt.trim() || (sektion === 'Hauptteig' ? '' : sektion)),
      fuer_produkte: fuerProdukte,
      zusatz_prozent: !istKommentar && mengenModus === 'prozent' ? dezimal(zusatzProzent) : 0,
      menge_pro_presse: !istKommentar && mengenModus === 'presse' ? dezimal(prosPresse) : 0,
      nicht_auf_bon: nichtAufBon,
      einheit: mengenModus === 'gewicht' && dosenModus ? 'dose' : '',
      dosen_gewicht_g: mengenModus === 'gewicht' && dosenModus ? dezimal(dosenGewicht) : 0,
      menge_kg: 0,
      ta_rolle: istKommentar ? 'sonstiges' : taRolle,
      ta_naeherung: !istKommentar && ['sonstiges', 'vorstufe'].includes(taRolle) && taNaeherung,
      ta_hinweis: taHinweis.trim(),
      prozent_bezug: prozentBezug,
      presse_bezug: 'endprodukt',
    };
    if (!istKommentar) {
      if (taRolle) { neu.ist_mehl = taRolle === 'mehl'; neu.ist_wasser = taRolle === 'fluessigkeit'; }
      if (mengenModus !== 'gewicht') {
        neu.menge_kg = 0;
      } else if (dosenModus) {
        neu.menge_kg = +((dezimal(dosenAnzahl) * dezimal(dosenGewicht)) / 1000).toFixed(6);
      } else {
        neu.menge_kg = +(dezimal(mengeG) / 1000).toFixed(6);
      }
    }
    if (!istKommentar && !(neu.menge_kg > 0 || neu.zusatz_prozent > 0 || neu.menge_pro_presse > 0)) { setFehler('Eine positive Menge eintragen oder die Zeile als Hinweis kennzeichnen.'); return; }
    if (istKommentar || taRolle !== 'vorstufe') {
      delete neu.ta_anteile; delete neu.ta_pro_kg; delete neu.vorstufe_nur_mehl_wasser; delete neu.vorstufe_ta;
    } else {
      const bezugsKg = mengenModus === 'gewicht' ? neu.menge_kg : 1;
      if (mehlAnteil === '' || wasserAnteil === '' || !(bezugsKg > 0) || (dezimal(mehlAnteil) + dezimal(wasserAnteil)) / 1000 > bezugsKg + 1e-9) {
        setFehler('Beide Vorstufenanteile eintragen (0 ist erlaubt). Ihre Summe darf das Vorstufengewicht nicht überschreiten.'); return;
      }
      neu.ta_pro_kg = { mehl_kg: dezimal(mehlAnteil) / 1000 / bezugsKg, fluessigkeit_kg: dezimal(wasserAnteil) / 1000 / bezugsKg };
      delete neu.ta_anteile;
      neu.ist_mehl = false; neu.ist_wasser = false;
      delete neu.vorstufe_nur_mehl_wasser; delete neu.vorstufe_ta;
    }
    if (neu.ist_mehl && neu.ist_wasser) { setFehler('Eine Zutat kann nicht vollständig Mehl und gleichzeitig vollständig Wasser sein. Für Mischungen Vorstufenanteile erfassen.'); return; }
    onSave(neu);
  }

  const dosenSummeG = dezimal(dosenAnzahl) * dezimal(dosenGewicht);

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
      {fehler && <p role="alert" style={{ color: 'var(--error)' }}>{fehler}</p>}
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
          onChange={(e) => { setName(e.target.value); setTaNaeherung(false); setTaHinweis(''); setZeigeVorschlaege(true); }}
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
                onClick={() => { setName(v.name); setTaNaeherung(false); setTaHinweis(''); setIstMehl(v.ist_mehl); setIstWasser(v.ist_wasser); setTaRolle(v.ist_mehl ? 'mehl' : v.ist_wasser ? 'fluessigkeit' : ''); setMehlAnteil(''); setWasserAnteil(''); setZeigeVorschlaege(false); }}
              >
                {v.name} {v.ist_mehl ? '· Mehl' : ''}{v.ist_wasser ? '· Wasser' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {!istKommentar && (
        <>
          <label style={{ display: 'block', marginBottom: 12 }}>Mengeneingabe
            <select aria-label="Mengeneingabe" value={mengenModus} onChange={e => { setMengenModus(e.target.value); if (taRolle === 'vorstufe') { setMehlAnteil(''); setWasserAnteil(''); } setFehler(''); }} style={{ width: '100%' }}>
              <option value="gewicht">Feste Menge in Gramm / Dosen</option>
              <option value="prozent">Bäckerprozent vom Gesamtmehl</option>
              <option value="presse">Menge pro Presse</option>
            </select>
          </label>
          {mengenModus === 'gewicht' && (!dosenModus ? (
            <div style={{ marginBottom: 10 }}>
              <label>
                Menge (g){' '}
                <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setDosenModus(true)}>
                  Dosen-Eingabe
                </button>
              </label>
              <input type="text" inputMode="decimal" placeholder="z.B. 500 oder 16,5" value={mengeG} onChange={(e) => { if (dezimalOk(e.target.value)) setMengeG(e.target.value); }} style={{ width: '100%' }} />
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
                  <input type="text" inputMode="decimal" value={dosenAnzahl} onChange={(e) => { if (dezimalOk(e.target.value)) setDosenAnzahl(e.target.value); }} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>Gewicht / Dose (g)</label>
                  <input type="text" inputMode="decimal" value={dosenGewicht} onChange={(e) => { if (dezimalOk(e.target.value)) setDosenGewicht(e.target.value); }} style={{ width: '100%' }} />
                </div>
              </div>
              {dosenSummeG > 0 && (
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
                  = {Math.round(dosenSummeG).toLocaleString('de-DE')} g gesamt
                </div>
              )}
            </div>
          ))}

          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" checked={nichtAufBon} onChange={(e) => setNichtAufBon(e.target.checked)} />
            <span>🚫 Nicht auf Bon drucken (z.B. vorgewogenes Backmittel)</span>
          </label>

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

          <label style={{ display: 'block', marginBottom: 10 }}>Zuordnung für die Mehl-/Flüssigkeitsbilanz
            <select aria-label="TA-Zuordnung" value={taRolle} onChange={e => { setTaRolle(e.target.value); setIstMehl(e.target.value === 'mehl'); setIstWasser(e.target.value === 'fluessigkeit'); }} style={{ width: '100%' }}>
              <option value="">Automatisch / Zuordnung noch offen</option>
              <option value="mehl">Getreidemehl / Mahlerzeugnis</option>
              <option value="fluessigkeit">Schüttflüssigkeit</option>
              <option value="sonstiges">Sonstige Zutat (z. B. Saaten / Altbrot)</option>
              <option value="vorstufe">Fertige Vorstufe – Anteile erfassen</option>
            </select>
          </label>
          {['sonstiges', 'vorstufe'].includes(taRolle) && <label style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" checked={taNaeherung} onChange={e => setTaNaeherung(e.target.checked)} />
            {taRolle === 'vorstufe' ? 'Anteile geschätzt: TA als Näherung kennzeichnen' : 'Kleine Backmittelzugabe mit unbekanntem Mehlanteil: TA als Näherung kennzeichnen'}
          </label>}
          {taNaeherung && ['sonstiges', 'vorstufe'].includes(taRolle) && <label>Grundlage der Schätzung
            <textarea aria-label="Grundlage der TA-Schätzung" value={taHinweis} onChange={e => setTaHinweis(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 12 }} />
          </label>}
          {taRolle === 'vorstufe' && <fieldset style={{ marginBottom: 12 }}>
            <legend>{mengenModus === 'gewicht' ? 'Anteile in der oben angegebenen Vorstufenmenge' : 'Anteile pro 1.000 g fertiger Vorstufe'}</legend>
            <label>Getreidemehl (g)<input aria-label="Vorstufenmehl (g)" inputMode="decimal" value={mehlAnteil} onChange={e => { if (dezimalOk(e.target.value)) setMehlAnteil(e.target.value); }} /></label>
            <label>Enthaltene Flüssigkeit (g)<input aria-label="Vorstufenflüssigkeit (g)" inputMode="decimal" value={wasserAnteil} onChange={e => { if (dezimalOk(e.target.value)) setWasserAnteil(e.target.value); }} /></label>
            <p className="muted">Saaten und Altbrot zählen nicht zum Mehl. Nur die fertige Vorstufe oder ihre Einzelzutaten erfassen, niemals beides. Beim Kochstück die nach dem Abkühlen auf Sollgewicht ausgeglichene Menge verwenden.</p>
          </fieldset>}

          {mengenModus === 'presse' && <div style={{ marginBottom: 10, padding: 12, background: 'var(--bg-subtle)', borderRadius: 10 }}>
            <label>Menge pro Presse (kg)</label>

            <input type="text" inputMode="decimal" value={prosPresse} onChange={(e) => { if (dezimalOk(e.target.value)) setProsPresse(e.target.value); }} style={{ width: '100%' }} placeholder="leer = normale Skalierung" />
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>💡 Bei 1 kg und 3 Pressen → 3 kg</p>
          </div>}

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

          {mengenModus === 'prozent' && <div style={{ marginBottom: 10 }}>
            <label>Prozentzugabe</label>
            <label>Bezug der Prozentmenge<select aria-label="Prozentbezug" value={prozentBezug} onChange={e => setProzentBezug(e.target.value)} style={{width:'100%'}}>
              <option value="mehl">Gesamtmehl = 100 % (Bäckerprozent)</option>
              <option value="basisteig">Basisteig vor Prozentzugaben = 100 %</option>
              <option value="endprodukt">Produktgewicht einschließlich Zugaben = 100 %</option>
            </select></label>
            <input type="text" inputMode="decimal" value={zusatzProzent} onChange={(e) => { if (dezimalOk(e.target.value)) setZusatzProzent(e.target.value); }} style={{ width: '100%' }} placeholder="z.B. 20 für 20% Rosinen" />
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>
              {prozentBezug === 'mehl' ? 'Gesamtmehl einschließlich Vorstufen = 100 %.' : prozentBezug === 'endprodukt' ? 'Beispiel: 12 % von 850 g Produktgewicht sind 102 g Zugabe; sie gehören zum Produktgewicht.' : 'Die festen Grundrezeptmengen bilden den Basisteig. Die Zugabe kommt anteilig hinzu und gehört zum Produktgewicht.'}
            </p>
          </div>}
        </>
      )}
    </Modal>
  );
}
