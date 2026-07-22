// Verwaltung (Admin): Rezeptliste + Detail-Editor.
// - Rezept anlegen/bearbeiten/löschen (mit Bestätigung)
// - Zutaten: einzeln bearbeiten, Batch-Hinzufügen, ↑↓-Reihenfolge, Löschen
// - Speichern mit optimistischer Sperre: 409 → Konfliktdialog (neu laden)
// - Einstellungen + Änderungsprotokoll

import { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ListPlus, Settings, History, Euro, FlaskConical, FileSpreadsheet } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { getSorted } from '../lib/rezeptFilter.js';
import { getZutatVorschlaege } from '../lib/batchParser.js';
import { ta } from '../lib/calc/ta.js';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { SkeletonCardList } from '../components/Skeleton.jsx';
import RezeptEditorModal from './admin/RezeptEditorModal.jsx';
import ZutatEditorModal from './admin/ZutatEditorModal.jsx';
import BatchZutatenModal from './admin/BatchZutatenModal.jsx';
import ChangelogModal from './admin/ChangelogModal.jsx';
import SettingsModal from './admin/SettingsModal.jsx';
import PreiseModal from './admin/PreiseModal.jsx';
import ZutatDatenModal from './admin/ZutatDatenModal.jsx';
import ImportExportModal from './admin/ImportExportModal.jsx';
import PasteImportModal from './admin/PasteImportModal.jsx';
import LmivBlock from './admin/LmivBlock.jsx';
import KostenBlock from './admin/KostenBlock.jsx';
import KalkulationBlock from './admin/KalkulationBlock.jsx';
import '../styles/baker.css';
import '../styles/admin.css';

export default function AdminPage() {
  const { recipes, settings, prices, customIngredients, initialLoadDone, refresh, mutateAndRefresh } = useData();
  const toast = useToast();
  const confirm = useConfirm();

  const [suche, setSuche] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // {typ:'rezept'|'rezept-neu'|'zutat'|'batch'|'settings'|'changelog', ...}

  const sorted = useMemo(() => getSorted(recipes), [recipes]);
  const gefiltert = suche
    ? sorted.filter((r) => r.name.toLowerCase().includes(suche.toLowerCase()))
    : sorted;
  const rezept = recipes.find((r) => r.id === selectedId) || null;
  const vorschlaege = useMemo(() => getZutatVorschlaege(recipes), [recipes]);
  const eigenePreiseMap = useMemo(
    () => Object.fromEntries(prices.map((p) => [p.zutat_name, { preis_kg: Number(p.preis_eur_kg) }])),
    [prices]
  );

  // Optimistisches Verschieben: Reihenfolge sofort anzeigen, Speichern
  // entprellt (600 ms nach dem letzten Klick EIN Request statt vieler).
  const [reihenfolgeDraft, setReihenfolgeDraft] = useState(null);
  const saveTimer = useRef(null);
  const zutatenAktuell = reihenfolgeDraft || rezept?.zutaten || [];
  useEffect(() => {
    setReihenfolgeDraft(null);
    clearTimeout(saveTimer.current);
  }, [selectedId]);

  // Gestapeltes Layout (Handy): nach Rezeptwahl zum Detail scrollen,
  // sonst bleibt der Nutzer in der langen Liste haengen.
  const detailRef = useRef(null);
  useEffect(() => {
    if (selectedId && window.innerWidth <= 900) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

  // Speichern mit 409-Behandlung: bei Konflikt Serverstand anbieten.
  async function speichereRezept(neu, { istNeu = false } = {}) {
    try {
      if (istNeu) {
        await mutateAndRefresh((a) => a.createRecipe(neu));
        setSelectedId(neu.id);
        toast.success('Rezept angelegt');
      } else {
        await mutateAndRefresh((a) => a.updateRecipe(neu.id, { ...neu, _version: neu._version }));
        toast.success('Gespeichert');
      }
      setModal(null);
    } catch (err) {
      if (err.status === 409 && err.body?.current) {
        const ok = await confirm({
          title: 'Konflikt beim Speichern',
          message:
            'Das Rezept wurde zwischenzeitlich auf einem anderen Gerät geändert. Deine Änderung wurde NICHT gespeichert. Aktuellen Stand laden?',
          confirmText: 'Neu laden',
        });
        if (ok) {
          await refresh({ full: true });
          setModal(null);
        }
      } else {
        toast.error('Speichern fehlgeschlagen: ' + err.message);
      }
    }
  }

  // Zutaten-Mutationen laufen ueber ein komplettes Rezept-Update
  async function speichereZutaten(zutatenNeu) {
    await speichereRezept({ ...rezept, zutaten: zutatenNeu });
  }

  function moveZutat(idx, delta) {
    const z = [...zutatenAktuell];
    const j = idx + delta;
    if (j < 0 || j >= z.length) return;
    [z[idx], z[j]] = [z[j], z[idx]];
    setReihenfolgeDraft(z);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await speichereZutaten(z);
      setReihenfolgeDraft(null);
    }, 600);
  }

  async function loescheRezept(r) {
    const ok = await confirm({
      title: 'Rezept löschen',
      message: `„${r.name}" wirklich löschen?`,
      confirmText: 'Löschen',
      danger: true,
    });
    if (!ok) return;
    try {
      await mutateAndRefresh((a) => a.deleteRecipe(r.id));
      if (selectedId === r.id) setSelectedId(null);
      toast.success('Rezept gelöscht');
    } catch (err) {
      toast.error('Löschen fehlgeschlagen: ' + err.message);
    }
  }

  async function speichereSettings(neu) {
    try {
      await mutateAndRefresh((a) => a.putSettings(neu));
      toast.success('Einstellungen gespeichert');
      setModal(null);
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    }
  }

  if (!initialLoadDone && recipes.length === 0) {
    return <SkeletonCardList count={4} />;
  }

  return (
    <div className="admin-layout">
      {/* Linke Spalte: Liste */}
      <div className="card admin-liste">
        <div className="admin-toolbar">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setModal({ typ: 'rezept-neu' })}>
            <Plus size={16} /> Neu
          </button>
          <button className="btn btn-ghost" title="Grundrezept aus Text einfügen" onClick={() => setModal({ typ: 'paste' })}>
            📋
          </button>
          <button className="btn btn-ghost" title="Einstellungen" onClick={() => setModal({ typ: 'settings' })}>
            <Settings size={18} />
          </button>
          <button className="btn btn-ghost" title="Änderungsprotokoll" onClick={() => setModal({ typ: 'changelog' })}>
            <History size={18} />
          </button>
          <button className="btn btn-ghost" title="Zutatpreise" onClick={() => setModal({ typ: 'preise' })}>
            <Euro size={18} />
          </button>
          <button className="btn btn-ghost" title="Zutat-Daten (Nährwerte)" onClick={() => setModal({ typ: 'zutatdaten' })}>
            <FlaskConical size={18} />
          </button>
          <button className="btn btn-ghost" title="Import / Export" onClick={() => setModal({ typ: 'importexport' })}>
            <FileSpreadsheet size={18} />
          </button>
        </div>
        <input
          type="search"
          placeholder="Suchen…"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <div className="admin-liste-scroll">
          {gefiltert.map((r) => (
            <button
              key={r.id}
              className="btn btn-ghost"
              onClick={() => setSelectedId(r.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                background: r.id === selectedId ? 'var(--accent-light)' : 'transparent',
                color: 'var(--text)',
                opacity: r.aktiv ? 1 : 0.45,
              }}
            >
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              <span className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{r.kategorie}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rechte Spalte: Detail */}
      {rezept ? (
        <div className="card" ref={detailRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0 }}>
              {rezept.name}{' '}
              <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
                {rezept.kategorie} · TA {ta(rezept)}
                {!rezept.aktiv && ' · INAKTIV'}
              </span>
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={() => setModal({ typ: 'rezept' })}>
                <Pencil size={15} /> Stammdaten
              </button>
              <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => loescheRezept(rezept)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '10px 0', fontSize: 13 }} className="muted">
            <span>Teiggewicht: {rezept.stueckgewicht_g} g</span>
            <span>Stück: {rezept.min_stueck}–{rezept.max_stueck}</span>
            {rezept.berechnung === 'blech' && (
              <span>Blech: {rezept.blech_breite_cm || 50}×{rezept.blech_laenge_cm || 80} cm</span>
            )}
            {rezept.produkte?.length > 1 && <span>{rezept.produkte.length} Produkte</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Zutaten ({zutatenAktuell.length})</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={() => setModal({ typ: 'zutat', idx: null })}>
                <Plus size={15} /> Zutat
              </button>
              <button className="btn btn-ghost" title="Mehrere Zutaten" onClick={() => setModal({ typ: 'batch' })}>
                <ListPlus size={17} />
              </button>
            </div>
          </div>

          <div>
            {zutatenAktuell.map((z, idx) => (
              <div
                key={idx}
                className="admin-zutat-row"
                style={{
                  background: z.ist_kommentar ? 'var(--bg-subtle)' : 'transparent',
                  fontStyle: z.ist_kommentar ? 'italic' : 'normal',
                }}
              >
                <span className="zutat-name" style={{ fontWeight: z.ist_kommentar ? 400 : 600 }}>
                  {z.ist_kommentar ? '📝 ' : ''}{z.name}
                  {z.bemerkung && <span className="muted" style={{ fontWeight: 400 }}> · {z.bemerkung}</span>}
                  {z.fuer_produkte?.length > 0 && (
                    <span className="muted" style={{ fontWeight: 400 }}> · nur: {z.fuer_produkte.join(', ')}</span>
                  )}
                </span>
                {!z.ist_kommentar && (
                  <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 14 }}>
                    {z.einheit === 'dose' && z.dosen_gewicht_g > 0
                      ? `${Math.round((z.menge_kg * 1000) / z.dosen_gewicht_g * 10) / 10} Do. à ${z.dosen_gewicht_g}g`
                      : z.menge_kg > 0
                        ? `${(+(z.menge_kg * 1000).toFixed(2)).toLocaleString('de-DE')} g`
                        : z.zusatz_prozent > 0
                          ? `${z.zusatz_prozent}%`
                          : z.menge_pro_presse > 0
                            ? `${z.menge_pro_presse} kg/Presse`
                            : '—'}
                  </span>
                )}
                {z.ist_mehl && <span title="Mehl (TA)">🌾</span>}
                {z.ist_wasser && <span title="Wasser (TA)">💧</span>}
                <div className="zutat-aktionen">
                  <button className="btn btn-ghost" onClick={() => moveZutat(idx, -1)} disabled={idx === 0} aria-label="Nach oben">
                    <ArrowUp size={14} />
                  </button>
                  <button className="btn btn-ghost" onClick={() => moveZutat(idx, 1)} disabled={idx === zutatenAktuell.length - 1} aria-label="Nach unten">
                    <ArrowDown size={14} />
                  </button>
                  <button className="btn btn-ghost" onClick={() => setModal({ typ: 'zutat', idx })} aria-label="Bearbeiten">
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--error)' }}
                    aria-label="Löschen"
                    onClick={async () => {
                      const ok = await confirm({ title: 'Zutat löschen', message: `„${z.name}" entfernen?`, confirmText: 'Löschen', danger: true });
                      if (ok) speichereZutaten(zutatenAktuell.filter((_, j) => j !== idx));
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <KostenBlock rezept={rezept} eigenePreise={eigenePreiseMap} />
          <KalkulationBlock
            rezept={rezept}
            eigenePreise={eigenePreiseMap}
            kalkulation={settings?.kalkulation}
            onSave={(k) => speichereSettings({ ...settings, kalkulation: k })}
          />
          <LmivBlock rezept={rezept} customZutaten={customIngredients.map((c) => ({ name: c.name, ...c.data }))} />
        </div>
      ) : (
        <div className="card">
          <p className="muted">Rezept links auswählen oder neu anlegen.</p>
        </div>
      )}

      {/* Modals */}
      {modal?.typ === 'rezept-neu' && (
        <RezeptEditorModal rezept={null} onClose={() => setModal(null)} onSave={(neu) => speichereRezept(neu, { istNeu: true })} />
      )}
      {modal?.typ === 'rezept' && rezept && (
        <RezeptEditorModal rezept={rezept} onClose={() => setModal(null)} onSave={(neu) => speichereRezept(neu)} />
      )}
      {modal?.typ === 'zutat' && rezept && (
        <ZutatEditorModal
          zutat={modal.idx != null ? zutatenAktuell[modal.idx] : null}
          rezept={rezept}
          vorschlaege={vorschlaege}
          onClose={() => setModal(null)}
          onSave={(z) => {
            const zutaten = [...zutatenAktuell];
            if (modal.idx != null) zutaten[modal.idx] = { ...zutaten[modal.idx], ...z };
            else zutaten.push(z);
            speichereZutaten(zutaten);
            setModal(null);
          }}
        />
      )}
      {modal?.typ === 'batch' && rezept && (
        <BatchZutatenModal
          vorschlaege={vorschlaege}
          onClose={() => setModal(null)}
          onSave={(neue) => {
            speichereZutaten([...zutatenAktuell, ...neue]);
            setModal(null);
            toast.success(`${neue.length} Zutaten hinzugefügt`);
          }}
        />
      )}
      {modal?.typ === 'settings' && (
        <SettingsModal settings={settings} onClose={() => setModal(null)} onSave={speichereSettings} />
      )}
      {modal?.typ === 'changelog' && <ChangelogModal onClose={() => setModal(null)} />}
      {modal?.typ === 'paste' && (
        <PasteImportModal
          vorschlaege={vorschlaege}
          onClose={() => setModal(null)}
          onSave={(rezept) => {
            speichereRezept(rezept, { istNeu: true });
          }}
        />
      )}
      {modal?.typ === 'importexport' && (
        <ImportExportModal
          recipes={recipes}
          settings={settings}
          onClose={() => setModal(null)}
          onImport={async (rezepte) => {
            try {
              const result = await mutateAndRefresh((a) => a.bulkUpsertRecipes(rezepte, 'upsert'));
              toast.success(`Import: ${result.inserted} neu, ${result.updated} aktualisiert`);
              setModal(null);
            } catch (err) {
              toast.error('Import fehlgeschlagen: ' + err.message);
            }
          }}
        />
      )}
      {modal?.typ === 'preise' && (
        <PreiseModal
          recipes={recipes}
          prices={prices}
          onClose={() => setModal(null)}
          onSave={async (eintraege) => {
            try {
              await mutateAndRefresh((a) => a.putPrices(eintraege));
              toast.success('Preise gespeichert');
              setModal(null);
            } catch (err) {
              toast.error('Fehler: ' + err.message);
            }
          }}
        />
      )}
      {modal?.typ === 'zutatdaten' && (
        <ZutatDatenModal
          recipes={recipes}
          customIngredients={customIngredients}
          onClose={() => setModal(null)}
          onSave={async (name, data) => {
            try {
              await mutateAndRefresh((a) => a.putCustomIngredient(name, data));
              toast.success(`„${name}" gespeichert`);
            } catch (err) {
              toast.error('Fehler: ' + err.message);
            }
          }}
          onDelete={async (name) => {
            try {
              await mutateAndRefresh((a) => a.deleteCustomIngredient(name));
              toast.success(`„${name}" gelöscht`);
            } catch (err) {
              toast.error('Fehler: ' + err.message);
            }
          }}
        />
      )}
    </div>
  );
}
