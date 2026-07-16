// Globale Lade-Leiste am oberen Bildschirmrand: lauscht auf das
// 'api-activity'-Event aus services/api.js (dem einzigen fetch-Pfad) und
// blendet waehrend laufender Requests eine animierte Gradient-Leiste ein.
// Kurzes Ausblende-Delay, damit schnell aufeinanderfolgende Requests nicht
// flackern.

import { useEffect, useRef, useState } from 'react';

export default function TopLoadingBar() {
  const [active, setActive] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    const onActivity = (e) => {
      const busy = (e.detail?.active || 0) > 0;
      if (busy) {
        clearTimeout(hideTimer.current);
        setActive(true);
      } else {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setActive(false), 250);
      }
    };
    window.addEventListener('api-activity', onActivity);
    return () => {
      window.removeEventListener('api-activity', onActivity);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return <div className={'top-loading-bar' + (active ? ' visible' : '')} aria-hidden="true" />;
}
