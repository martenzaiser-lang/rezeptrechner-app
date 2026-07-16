// Cloud-Status-Anzeige im Header (wie die ☁️-Wolke der alten App):
// Online (gruen) / Sync... (gelb) / Fehler (rot) / Offline (grau).

import { Cloud, CloudOff, RefreshCw, CloudAlert } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';

const STATUS = {
  online: { icon: Cloud, label: 'Online', color: 'var(--success)' },
  sync: { icon: RefreshCw, label: 'Sync…', color: 'var(--warning)' },
  fehler: { icon: CloudAlert, label: 'Fehler', color: 'var(--error)' },
  offline: { icon: CloudOff, label: 'Offline', color: 'var(--muted)' },
};

export default function CloudStatus() {
  const { cloudStatus } = useData();
  const s = STATUS[cloudStatus] || STATUS.offline;
  const Icon = s.icon;
  return (
    <span
      className="cloud-status"
      title={`Cloud: ${s.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        color: s.color,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={16} className={cloudStatus === 'sync' ? 'spin' : ''} />
      <span className="cloud-status-label">{s.label}</span>
    </span>
  );
}
