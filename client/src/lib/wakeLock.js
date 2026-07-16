// Wake-Lock: verhindert Display-Schlaf waehrend des Abwiegens (Tablets).

let lock = null;

export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
    }
  } catch {
    // Nicht unterstuetzt / verweigert — kein harter Fehler
  }
}

export function releaseWakeLock() {
  try {
    lock?.release();
  } catch {}
  lock = null;
}
