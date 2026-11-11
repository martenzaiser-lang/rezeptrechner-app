import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, ArrowUpRight, Search } from 'lucide-react';
import Modal from './Modal.jsx';
import { useData } from '../context/DataContext.jsx';
import { gebaeckKatalog, gebaeckAllergene, gebaeckeFuerRezept } from '../lib/calc/gebaeckaufbau.js';
import '../styles/gebaeckaufbau.css';

export function GebaeckVerwendungen({ rezeptId, onOpen }) {
  const { settings } = useData();
  const produkte = gebaeckeFuerRezept(settings.gebaeckaufbauten, rezeptId);
  if (!produkte.length) return null;
  return <button className="btn gebaeck-verwendungen" onClick={onOpen}>
    <Layers size={19} aria-hidden="true" />
    <span><strong>Gebäckaufbau ansehen</strong><small>Dieses Rezept wird in {produkte.length} {produkte.length === 1 ? 'Gebäck' : 'Gebäcken'} verwendet.</small></span>
    <ArrowUpRight size={17} aria-hidden="true" />
  </button>;
}

export default function GebaeckAufbau({ onClose, rezeptId = '', onRezeptOpen }) {
  const { settings, calculationRecipes: recipes, calculationIngredients } = useData();
  const [suche, setSuche] = useState(''), [nurOffen, setNurOffen] = useState(false);
  const [filterRezept, setFilterRezept] = useState(rezeptId), [auswahl, setAuswahl] = useState('');
  const detail = useRef(null);
  const katalog = useMemo(() => gebaeckKatalog(settings.gebaeckaufbauten), [settings.gebaeckaufbauten]);
  const rows = useMemo(() => katalog.produkte.map(p => ({ ...p, profil: gebaeckAllergene(p, recipes, calculationIngredients) }))
    .sort((a,b) => a.name.localeCompare(b.name, 'de')), [katalog, recipes, calculationIngredients]);
  const sichtbar = rows.filter(p => (!filterRezept || p.bestandteile.some(b => b.rezeptId === filterRezept))
    && (!nurOffen || !p.profil.vollstaendig)
    && (!suche.trim() || [p.name, ...(p.artikelnummern || []), ...p.profil.bestandteile.map(b => b.name)].join(' ').toLocaleLowerCase('de').includes(suche.trim().toLocaleLowerCase('de'))));
  const produkt = sichtbar.find(p => p.id === auswahl) || sichtbar[0];
  useEffect(() => {
    if (auswahl && window.innerWidth < 760) detail.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [auswahl]);
  return <Modal title="Gebäckaufbau" maxWidth={1180} onClose={onClose} footer={<button className="btn" onClick={onClose}>Schließen</button>}>
    <div className="gebaeck-aufbau">
      <p className="gebaeck-intro">Grundteige, Füllungen und Überzüge gehören hier zum fertigen Gebäck. Die Allergene werden aus den aktuell hinterlegten Rezepten und Rohstoffen ermittelt.</p>
      <div className="gebaeck-filter">
        <label className="gebaeck-suche"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Gebäck oder Bestandteil suchen" placeholder="Gebäck, Bestandteil oder Artikelnummer" value={suche} onChange={e => setSuche(e.target.value)} /></label>
        <label className="gebaeck-offen"><input type="checkbox" checked={nurOffen} onChange={e => setNurOffen(e.target.checked)} />Nur Angaben prüfen</label>
      </div>
      {filterRezept && <div className="gebaeck-bezug"><span>Verwendungen von <strong>{recipes.find(r => r.id === filterRezept)?.name || 'diesem Rezept'}</strong></span><button className="btn" onClick={() => setFilterRezept('')}>Alle Gebäcke zeigen</button></div>}
      {katalog.fehler.length > 0 && <p role="alert">Die hinterlegten Verknüpfungen konnten nicht gelesen werden: {katalog.fehler.join(' ')}</p>}
      <p className="gebaeck-ergebnis" role="status">{sichtbar.length} {sichtbar.length === 1 ? 'Gebäck' : 'Gebäcke'}{rows.length ? ` · ${rows.filter(p => !p.profil.vollstaendig).length} mit offenen Angaben` : ''}</p>
      {!sichtbar.length ? <p>{rows.length ? 'Kein Gebäck passt zu dieser Auswahl.' : 'Es sind noch keine Gebäckaufbauten hinterlegt.'}</p> : <div className="gebaeck-layout">
        <nav className="gebaeck-liste" aria-label="Verknüpfte Gebäcke">{sichtbar.map(p => <button key={p.id} className="gebaeck-wahl" aria-current={p.id === produkt?.id ? 'true' : undefined} onClick={() => setAuswahl(p.id)}>
          <strong>{p.name}</strong><span>{p.profil.vollstaendig ? 'Allergene ermittelt' : 'Angaben prüfen'}{p.imShop === false ? ' · nicht im Shop' : ''}</span>
        </button>)}</nav>
        {produkt && <section ref={detail} className="gebaeck-detail" aria-label={produkt.name}>
          <div className="gebaeck-kopf"><h3>{produkt.name}</h3><span className={'gebaeck-status' + (produkt.profil.vollstaendig ? '' : ' ist-offen')}>{produkt.profil.vollstaendig ? 'Allergene ermittelt' : 'Angaben prüfen'}</span></div>
          {!!produkt.artikelnummern?.length && <p className="gebaeck-meta">Artikelnummern: {produkt.artikelnummern.join(', ')}</p>}
          {produkt.hinweis && <p className="gebaeck-hinweis">{produkt.hinweis}</p>}
          <h4>So setzt sich das Gebäck zusammen</h4>
          <ol className="gebaeck-bestandteile">{produkt.profil.bestandteile.map((b,i) => <li key={i}>
            <div><span className="gebaeck-rolle">{b.rolle || (b.typ === 'rezept' ? 'Rezept' : 'Rohstoff')}</span><strong>{b.name}</strong><span className="gebaeck-menge">{b.mengeHinweis || 'Menge nicht angegeben'}</span></div>
            {b.gefunden && onRezeptOpen && <button className="btn" aria-label={`Rezept öffnen: ${b.name}`} onClick={() => onRezeptOpen(b.rezeptId, b.produktName)}><ArrowUpRight size={16} aria-hidden="true" />Rezept</button>}
            {!!b.fehler.length && <p className="gebaeck-fehler">{b.fehler.join(' ')}</p>}
          </li>)}</ol>
          <div className="gebaeck-allergene">
            <h4>{produkt.profil.vollstaendig ? 'Enthaltene Allergene im fertigen Gebäck' : 'Bisher bekannte enthaltene Allergene'}</h4>
            <p>{produkt.profil.allergene || (produkt.profil.vollstaendig ? 'Keine kennzeichnungspflichtigen Allergene in den verknüpften Bestandteilen.' : 'Noch keine vollständige Angabe möglich.')}</p>
            {!!produkt.profil.spuren && <><h4>Mögliche Spuren aus den Rohstoffen</h4><p>{produkt.profil.spuren}</p></>}
            {!produkt.profil.vollstaendig && <div className="gebaeck-fehler" role="status"><strong>Vor einer vollständigen Allergenangabe prüfen:</strong><ul>{produkt.profil.offen.map((f,i) => <li key={i}>{f}</li>)}</ul></div>}
          </div>
          <p className="gebaeck-meta">{produkt.bestaetigtAm ? `Betriebliche Zuordnung bestätigt am ${produkt.bestaetigtAm.split('-').reverse().join('.')}. ` : ''}Mengenhinweise werden nicht in die Grundrezepte oder deren Nährwerte eingerechnet. Für Nährwerte und Zutatenanteile des fertigen Gebäcks ist eine vollständige Mengenbasis erforderlich.</p>
        </section>}
      </div>}
    </div>
  </Modal>;
}
