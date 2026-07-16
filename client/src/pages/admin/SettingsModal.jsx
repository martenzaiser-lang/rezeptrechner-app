// Einstellungen: Betriebsname (weitere Settings folgen bei Bedarf).
// PIN/BakerPin der alten App sind durch das echte Login ersetzt.

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [name, setName] = useState(settings?.name || '');

  return (
    <Modal
      title="Einstellungen"
      onClose={onClose}
      maxWidth={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={() => onSave({ name })}>Speichern</button>
        </>
      }
    >
      <label>Betriebsname</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
    </Modal>
  );
}
