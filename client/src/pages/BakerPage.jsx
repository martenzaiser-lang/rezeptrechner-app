// Backen-Screen: Rezeptauswahl + Skalierung fuer Teigmacher, Kuchenmacher
// und Admin. Verhalten 1:1 wie alte App:
// - Eingaben (Stueck/Blech/Pressen/Teiler) werden pro Rolle und Rezept
//   in localStorage persistiert und beim Rezeptwechsel wiederhergestellt
// - Hotkeys: Zahlen 1-9 = schnelle Rezeptwahl (ausserhalb von Inputs)
// - Kuchenmacher: keine Drucker-/Sauerteig-UI (kommt Phase 8 dazu)

import { useEffect, useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { auth } from '../services/api.js';
import { sichtbareRezepte } from '../lib/rezeptFilter.js';
import { loadEingaben, saveEingabe, getHeuteDatum } from '../lib/eingaben.js';
import { berechneBaker, teigZusammenfassung } from '../lib/calc/bakerBerechnung.js';
import { schuettTemperatur, schuettHinweis } from '../lib/calc/schuettwasser.js';
import { calcNutrition, getRezeptAllergene, formatAllergene } from '../lib/calc/naehrwerteLookup.js';
import { calcRezeptKosten } from '../lib/preise.js';
import { getAnzeige } from '../lib/anzeige.js';
import MengenSteuerung from './baker/MengenSteuerung.jsx';
import ZutatenListe from './baker/ZutatenListe.jsx';
import QuickInfo from './baker/QuickInfo.jsx';
import AbwiegenFullscreen from './baker/AbwiegenFullscreen.jsx';
import PlanungModal from './baker/PlanungModal.jsx';
import ZettelModal from './baker/ZettelModal.jsx';
import DruckerModal, { getRezeptBonOverrides } from './baker/DruckerModal.jsx';
import PrintSheet from './baker/PrintSheet.jsx';
import { SkeletonCardList } from '../components/Skeleton.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  generateBonBytes, generateVorteigBonBytes, getVorteigZutaten,
  getBonConfig, teilerInfoText,
} from '../lib/print/escpos.js';
import {
  isPrinterConnected, isBluetoothSupported, connectPrinter, sendToPrinter,
  autoReconnectPrinter, onPrinterStatusChange,
} from '../lib/print/bluetooth.js';
import { berechneKochzettel, berechneSauerteigzettel } from '../lib/print/zettel.js';
import { loadEingaben as ladeAlleEingaben } from '../lib/eingaben.js';
import { Printer } from 'lucide-react';
import '../styles/baker.css';

function defaultEingabe(r, gespeichert) {
  const bB = r.blech_breite_cm > 0 ? r.blech_breite_cm : 50;
  const bL = r.blech_laenge_cm > 0 ? r.blech_laenge_cm : 80;
  return {
    rezeptId: r.id,
    rezeptName: r.name,
    multi: Boolean(r.produkte && r.produkte.length > 1),
    stueck: gespeichert?.stueck > 0 ? gespeichert.stueck : (r.min_stueck || 1),
    produktStueck: gespeichert?.multi ? { ...(gespeichert.produktStueck || {}) } : {},
    faktor: gespeichert?.faktor || 1,
    blechN: gespeichert?.blechN > 0 ? gespeichert.blechN : 1,
    blechB: gespeichert?.blechB > 0 ? gespeichert.blechB : bB,
    blechL: gespeichert?.blechL > 0 ? gespeichert.blechL : bL,
  };
}

function fw(kg) {
  const g = Math.round(kg * 1000);
  return g >= 1000
    ? `${(g / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
    : `${g} g`;
}

export default function BakerPage() {
  const { recipes, prices, settings, initialLoadDone } = useData();
  const role = auth.getRole();
  const anzeige = getAnzeige(settings, role);

  const sichtbar = useMemo(() => sichtbareRezepte(recipes, role), [recipes, role]);
  const [selectedId, setSelectedId] = useState('');
  const [eingabe, setEingabe] = useState(null);
  const [abwiegen, setAbwiegen] = useState(false);
  const [schuettOpen, setSchuettOpen] = useState(false);
  const [planungOpen, setPlanungOpen] = useState(false);
  const [zettel, setZettel] = useState(null);
  const [druckerOpen, setDruckerOpen] = useState(false);
  const [printerOn, setPrinterOn] = useState(isPrinterConnected());
  const toast = useToast();
  const istKuchenmacher = role === 'kuchenmacher';
  const [schuett, setSchuett] = useState({ teig: 26, raum: 22, mehl: 20, knet: 8 });

  const rezept = sichtbar.find((r) => r.id === selectedId) || null;

  // Erstes Rezept vorauswaehlen, sobald Daten da sind
  useEffect(() => {
    if (!selectedId && sichtbar.length) selectRezept(sichtbar[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sichtbar.length]);

  function selectRezept(id) {
    const r = sichtbar.find((x) => x.id === id);
    if (!r) return;
    const alle = loadEingaben(role);
    setSelectedId(id);
    setEingabe(defaultEingabe(r, alle[id]));
  }

  // Eingabe aendern + persistieren (wie saveTeigmacherEingaben)
  function updateEingabe(next) {
    setEingabe(next);
    saveEingabe(role, { ...next, datum: getHeuteDatum() });
  }

  // Hotkeys: 1-9 = Rezeptwahl, Ctrl+P = A4-Druck (nicht in Eingabefeldern)
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 'p') return; // Browser-Druck durchlassen (PrintSheet ist gerendert)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9 && sichtbar[n - 1]) selectRezept(sichtbar[n - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sichtbar]);

  // Drucker: Status verfolgen + Auto-Reconnect zum gespeicherten Geraet
  useEffect(() => {
    const off = onPrinterStatusChange(setPrinterOn);
    if (!istKuchenmacher) autoReconnectPrinter();
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bon drucken: Hauptteig-Bon + aktivierte Abschnitts-Bons (wie alte App)
  async function printBon() {
    if (!ergebnis || !rezept) return;
    try {
      if (!isPrinterConnected()) {
        toast.info('Drucker verbinden…');
        await connectPrinter();
      }
      const cfg = { ...getBonConfig(rezept), ...getRezeptBonOverrides(rezept.id) };
      const teiler = ergebnis.isBlech ? '' : teilerInfoText(eingabe.faktor);
      let produktInfo;
      if (ergebnis.isBlech) {
        const n = Math.max(1, parseInt(eingabe.blechN) || 1);
        produktInfo = (n > 1 ? `${n}x ` : '') + `Blech ${eingabe.blechB}x${eingabe.blechL}cm`;
      } else if (ergebnis.hasMulti) {
        produktInfo = rezept.produkte
          .map((p) => ({ p, val: eingabe.produktStueck?.[p.name] || 0 }))
          .filter(({ val }) => val > 0)
          .map(({ p, val }) => (val % 1 === 0 ? val : val.toFixed(1)) + 'x ' + p.name)
          .join(', ') || '-';
      } else {
        const n = eingabe.stueck || 1;
        produktInfo = (n % 1 === 0 ? n : n.toFixed(1)) + ' Stueck';
      }

      let bonCount = 1;
      await sendToPrinter(generateBonBytes(rezept, ergebnis.sk, produktInfo, teiler, { cfg }));
      for (const [option, typ, titel] of [
        ['bonQuellstueck', 'quellstück', 'QUELLSTÜCK'],
        ['bonBruehstueck', 'brühstück', 'BRÜHSTÜCK'],
        ['bonKochstueck', 'kochstück', 'KOCHSTÜCK'],
        ['bonSauerteig', 'sauerteig', 'SAUERTEIG'],
      ]) {
        if (!cfg[option]) continue;
        const zutaten = getVorteigZutaten(rezept, ergebnis.sk, typ);
        if (!zutaten.length) continue;
        await new Promise((r) => setTimeout(r, 500));
        await sendToPrinter(generateVorteigBonBytes(rezept, zutaten, produktInfo, titel, teiler));
        bonCount++;
      }
      toast.success(bonCount > 1 ? `${bonCount} Bons gedruckt` : 'Bon gedruckt');
    } catch (err) {
      if (err.name !== 'NotFoundError') toast.error('Druckfehler: ' + err.message);
    }
  }

  function openKochzettel() {
    const z = berechneKochzettel(recipes, ladeAlleEingaben(role), getHeuteDatum());
    if (!z) {
      toast.info('Heute keine Rezepte mit Kochstück (mind. 5 Stück)');
      return;
    }
    setZettel(z);
  }

  function openSauerteigzettel() {
    const z = berechneSauerteigzettel(recipes, ladeAlleEingaben(role), getHeuteDatum());
    if (!z) {
      toast.info('Heute keine Rezepte mit Sauerteig (mind. 5 Stück)');
      return;
    }
    setZettel(z);
  }

  if (!initialLoadDone && recipes.length === 0) {
    return <SkeletonCardList count={4} />;
  }

  const ergebnis = rezept && eingabe ? berechneBaker(rezept, eingabe) : null;
  const zusammenfassung =
    ergebnis && !ergebnis.hasMulti ? teigZusammenfassung(rezept, ergebnis.sk, ergebnis.teigGesamtKg) : null;
  const schuettErg = schuettTemperatur(schuett);

  return (
    <div>
      <div className="baker-ctrl" style={{ marginBottom: 14 }}>
        <select
          value={selectedId}
          onChange={(e) => selectRezept(e.target.value)}
          style={{ minHeight: 46, fontSize: 16, fontWeight: 700, flex: '1 1 260px', maxWidth: 420 }}
          aria-label="Rezept wählen"
        >
          {sichtbar.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.produkte?.length > 1 ? ` (${r.produkte.length} Produkte)` : ''}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => setSchuettOpen(true)} title="Schütttemperatur">🌡️</button>
        {!istKuchenmacher && (
          <>
            <button className="btn" onClick={() => setPlanungOpen(true)} title="Produktionsplanung">📋</button>
            <button className="btn" onClick={openKochzettel} title="Kochstück-Zettel">🥣</button>
            <button className="btn" onClick={openSauerteigzettel} title="Sauerteig-Zettel">🥖</button>
            {isBluetoothSupported() && (
              <>
                <button className="btn" onClick={printBon} disabled={!ergebnis} title="Bon drucken">
                  🧾 Bon
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setDruckerOpen(true)}
                  title={printerOn ? 'Drucker verbunden' : 'Drucker nicht verbunden'}
                  style={{ color: printerOn ? 'var(--success)' : 'var(--muted)' }}
                >
                  <Printer size={18} />
                </button>
              </>
            )}
          </>
        )}
        <button className="btn" onClick={() => window.print()} disabled={!ergebnis} title="A4-Rezeptblatt drucken (Strg+P)">
          🖨 PDF
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setAbwiegen(true)}
          disabled={!ergebnis}
          title="Abwiegen (Vollbild)"
        >
          <Scale size={18} /> Abwiegen
        </button>
      </div>

      {rezept && eingabe && (
        <div className="card">
          <h2 style={{ margin: '0 0 10px' }}>{rezept.name}</h2>
          <MengenSteuerung rezept={rezept} eingabe={eingabe} onChange={updateEingabe} ergebnis={ergebnis} />
          <QuickInfo rezept={rezept} sk={ergebnis?.sk} anzeige={anzeige} />
          {zusammenfassung && (
            <div className="teig-zusammenfassung">
              {[
                `${fw(zusammenfassung.teigKg)} Teig`,
                ...Object.entries(zusammenfassung.gruppen).map(([n, w]) => `${n} (${fw(w)})`),
              ].join(' + ')}
            </div>
          )}
          {ergebnis ? (
            <ZutatenListe rezept={rezept} sk={ergebnis.sk} teigGesamtKg={ergebnis.teigGesamtKg} />
          ) : (
            <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>
              {rezept.produkte?.length > 1 ? 'Stückzahlen bei den Produkten eingeben' : 'Stückzahl eingeben'}
            </p>
          )}
          {rezept.anmerkungen?.trim() && (
            <div className="note-block">
              <div className="note-t">⚠️ WICHTIG</div>
              <div className="note-txt">{rezept.anmerkungen}</div>
            </div>
          )}
          {ergebnis && (() => {
            const nw = anzeige.naehrwerte ? calcNutrition(rezept, ergebnis.sk) : { vollstaendig: false, fehlend: [] };
            const allergene = anzeige.allergene ? getRezeptAllergene(rezept) : [];
            const eigenePreise = {};
            prices.forEach((p) => { eigenePreise[p.zutat_name] = { preis_kg: Number(p.preis_eur_kg) }; });
            const kosten = anzeige.kosten ? calcRezeptKosten(rezept, ergebnis.sk, eigenePreise) : 0;
            const stueckzahl = rezept.produkte?.length > 1
              ? Object.values(eingabe.produktStueck || {}).reduce((a, b) => a + b, 0)
              : (eingabe.stueck || 1);
            if (!nw.vollstaendig && !allergene.length && !(kosten > 0)) return null;
            return (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, fontSize: 13 }}>
                {kosten > 0 && (
                  <div className="quick-chip">
                    💰 <span className="chip-val">{kosten.toFixed(2).replace('.', ',')} €</span>
                    {stueckzahl > 0 && <span className="muted">({(kosten / stueckzahl).toFixed(2).replace('.', ',')} €/St.)</span>}
                  </div>
                )}
                {nw.vollstaendig && nw.gesamt > 0 && (
                  <div className="quick-chip" title="pro 100 g">
                    🔥 {Math.round(nw.kcal / (nw.gesamt / 100))} kcal · E {(nw.protein / (nw.gesamt / 100)).toFixed(1)} g · KH {(nw.carbs / (nw.gesamt / 100)).toFixed(1)} g · F {(nw.fat / (nw.gesamt / 100)).toFixed(1)} g
                  </div>
                )}
                {allergene.length > 0 && (
                  <div className="quick-chip chip-warn">⚠️ {formatAllergene(allergene, true)}</div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {abwiegen && ergebnis && (
        <AbwiegenFullscreen
          rezept={rezept}
          sk={ergebnis.sk}
          teigGesamtKg={ergebnis.teigGesamtKg}
          onClose={() => setAbwiegen(false)}
        />
      )}

      {planungOpen && <PlanungModal recipes={sichtbar} onClose={() => setPlanungOpen(false)} />}
      {zettel && <ZettelModal zettel={zettel} onClose={() => setZettel(null)} />}
      {druckerOpen && <DruckerModal rezept={rezept} onClose={() => setDruckerOpen(false)} />}
      {ergebnis && (
        <PrintSheet
          rezept={rezept}
          sk={ergebnis.sk}
          teigGesamtKg={ergebnis.teigGesamtKg}
          mengeInfo={
            ergebnis.isBlech
              ? `${eingabe.blechN}× Blech ${eingabe.blechB}×${eingabe.blechL} cm`
              : ergebnis.hasMulti
                ? rezept.produkte
                    .map((p) => ({ p, val: eingabe.produktStueck?.[p.name] || 0 }))
                    .filter(({ val }) => val > 0)
                    .map(({ p, val }) => `${val}× ${p.name}`)
                    .join(', ')
                : `${eingabe.stueck} Stück${ergebnis.faktor !== 1 ? ` (×${ergebnis.faktor})` : ''}`
          }
        />
      )}

      {schuettOpen && (
        <div className="modal-overlay" onClick={() => setSchuettOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>🌡️ Schütttemperatur</h2>
            {[
              ['teig', 'Gewünschte Teigtemp. (°C)'],
              ['raum', 'Raumtemperatur (°C)'],
              ['mehl', 'Mehltemperatur (°C)'],
              ['knet', 'Kneterwärmung (°C)'],
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label>{label}</label>
                <input
                  type="number"
                  step="0.5"
                  value={schuett[key]}
                  onChange={(e) => setSchuett({ ...schuett, [key]: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
            <div className="teig-box" style={{ margin: '14px 0', minWidth: 0 }}>
              <div className="teig-lbl">Schüttwasser</div>
              <div className="teig-val">{schuettErg} °C</div>
              <div className="muted" style={{ fontSize: 13 }}>{schuettHinweis(schuettErg)}</div>
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={() => setSchuettOpen(false)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
