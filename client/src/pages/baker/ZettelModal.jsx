// Kochstueck-/Sauerteig-Zettel-Anzeige + Browser-Druck + Bon-Druck.

import Modal from '../../components/Modal.jsx';
import { generateZettelBonBytes } from '../../lib/print/zettel.js';
import { isPrinterConnected, sendToPrinter } from '../../lib/print/bluetooth.js';
import { getHeuteDatum } from '../../lib/eingaben.js';
import { useToast } from '../../components/Toast.jsx';

export default function ZettelModal({ zettel, onClose }) {
  const toast = useToast();
  const istKoch = zettel.typ === 'koerner';
  const titel = istKoch ? '🌾 Kochstück-Zettel' : '🥖 Sauerteig-Zettel';
  const fmtG = (kg) => Math.round(kg * 1000).toLocaleString('de-DE') + ' g';

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function browserDruck() {
    const w = window.open('', '', 'width=600,height=400');
    if (!w) { toast.error('Druckfenster konnte nicht geöffnet werden. Bitte Pop-ups für diese App zulassen.'); return; }
    let inhalt = `<h2>${titel} — ${getHeuteDatum()}</h2>`;
    if (istKoch) {
      zettel.data.forEach((rd) => {
        inhalt += `<div class="zettel-card"><h4>${esc(rd.name)}</h4>`;
        rd.zutaten.forEach((z) => { inhalt += `<div class="zettel-item"><span>${esc(z.name)}</span><span>${fmtG(z.kg)}</span></div>`; });
        if (rd.wasser > 0) inhalt += `<div class="zettel-item"><span>+ Wasser</span><span>${fmtG(rd.wasser)}</span></div>`;
        inhalt += '</div>';
      });
    } else {
      inhalt += '<div class="zettel-card">';
      zettel.data.forEach((rd) => { inhalt += `<div class="zettel-item"><span>${esc(rd.name)}</span><span>${fmtG(rd.kg)}</span></div>`; });
      inhalt += '</div>';
    }
    if (istKoch) inhalt += '<p>Nach dem Abkühlen netto wiegen und Wasser bis zum Sollgewicht ergänzen. Ausgleich nicht doppelt in der Rezeptur rechnen.</p>';
    inhalt += `<div class="zettel-total"><span>GESAMT</span><span>${fmtG(zettel.gesamt)}</span></div>`;
    w.document.write(`<html><head><title>Zettel</title><style>body{font-family:Inter,sans-serif;padding:20px;color:#000}.zettel-card{border:1px solid #333;padding:12px;margin:10px 0;border-radius:6px}.zettel-item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ccc}.zettel-total{margin-top:10px;padding-top:8px;border-top:2px solid #000;font-weight:bold;display:flex;justify-content:space-between;font-size:18px}</style></head><body>${inhalt}</body></html>`);
    w.document.close();
    w.print();
  }

  async function bonDruck() {
    try {
      await sendToPrinter(generateZettelBonBytes(zettel, getHeuteDatum()));
      toast.success('Zettel gedruckt');
    } catch (err) {
      toast.error('Druckfehler: ' + err.message);
    }
  }

  return (
    <Modal
      title={titel}
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          <button className="btn" disabled={!!zettel.fehler?.length} onClick={browserDruck}>🖨 Browser</button>
          {isPrinterConnected() && (
            <button className="btn btn-primary" disabled={!!zettel.fehler?.length} onClick={bonDruck}>🧾 Bon drucken</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
        </>
      }
    >
      {zettel.fehler?.map(f => <p role="alert" key={f}>Berechnung unvollständig: {f}</p>)}
      {istKoch && <p>Nach dem Abkühlen netto wiegen, Wasser bis zum Sollgewicht ergänzen und in der Rückwaage dokumentieren.</p>}
      {istKoch ? (
        zettel.data.map((rd) => (
          <div key={rd.name} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <h4 style={{ margin: '0 0 8px' }}>{rd.name}</h4>
            {rd.zutaten.map((z) => (
              <div key={z.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{z.name}</span>
                <strong>{fmtG(z.kg)}</strong>
              </div>
            ))}
            {rd.wasser > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: 'var(--info)', fontWeight: 600 }}>
                <span>+ Wasser</span>
                <span>{fmtG(rd.wasser)}</span>
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          {zettel.data.map((rd) => (
            <div key={rd.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
              <span>{rd.name}</span>
              <strong>{fmtG(rd.kg)}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="teig-box" style={{ width: '100%' }}>
        <div className="teig-lbl">Gesamt</div>
        <div className="teig-val">{fmtG(zettel.gesamt)}</div>
      </div>
    </Modal>
  );
}
