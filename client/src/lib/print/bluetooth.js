// Web-Bluetooth-Transport fuer den 58mm-Thermodrucker — portiert aus der
// alten App (connectPrinter Z. 6674 ff.). Gespeichertes Geraet + Auto-
// Reconnect: localStorage 'rz_printer_device' (Device-ID).
//
// Nur in Chrome/Edge ueber HTTPS oder localhost verfuegbar.

const CHUNK_SIZE = 100; // Bytes pro BLE-Write (konservativ, wie alte App)
const SERVICE_UUIDS = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'];

let device = null;
let characteristic = null;
let connected = false;
const listeners = new Set();

export function onPrinterStatusChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(connected));
}

export function isPrinterConnected() {
  return connected;
}

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

function onDisconnected() {
  connected = false;
  characteristic = null;
  notify();
}

async function setupDevice(dev) {
  dev.addEventListener('gattserverdisconnected', onDisconnected);
  const server = await dev.gatt.connect();

  let service = null;
  for (const uuid of SERVICE_UUIDS) {
    try {
      service = await server.getPrimaryService(uuid);
      break;
    } catch {}
  }
  if (!service) {
    // Fallback: alle Services durchsuchen
    const services = await server.getPrimaryServices();
    for (const s of services) {
      const chars = await s.getCharacteristics();
      if (chars.some((c) => c.properties.write || c.properties.writeWithoutResponse)) {
        service = s;
        break;
      }
    }
  }
  if (!service) throw new Error('Kein Drucker-Service gefunden');

  const chars = await service.getCharacteristics();
  characteristic = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
  if (!characteristic) throw new Error('Keine beschreibbare Charakteristik gefunden');

  device = dev;
  connected = true;
  try {
    localStorage.setItem('rz_printer_device', dev.id);
  } catch {}
  notify();
}

// Manuelles Verbinden (User-Geste noetig)
export async function connectPrinter() {
  if (!isBluetoothSupported()) throw new Error('Bluetooth wird von diesem Browser nicht unterstützt');
  const dev = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICE_UUIDS,
  });
  await setupDevice(dev);
}

// Auto-Reconnect zum gespeicherten Geraet (ohne Dialog; braucht
// Chrome-Permission "Bluetooth-Geraete-Berechtigungen behalten")
export async function autoReconnectPrinter() {
  if (!isBluetoothSupported() || connected) return false;
  const savedId = localStorage.getItem('rz_printer_device');
  if (!savedId || !navigator.bluetooth.getDevices) return false;
  try {
    const devices = await navigator.bluetooth.getDevices();
    const dev = devices.find((d) => d.id === savedId);
    if (!dev) return false;
    await setupDevice(dev);
    return true;
  } catch {
    return false;
  }
}

export function disconnectPrinter() {
  try {
    device?.gatt?.disconnect();
  } catch {}
  onDisconnected();
}

// Bytes in Chunks senden (BLE-MTU-Limit)
export async function sendToPrinter(bytes) {
  if (!connected || !characteristic) throw new Error('Drucker nicht verbunden');
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // kleine Pause, damit der Drucker-Puffer nicht ueberlaeuft
    await new Promise((r) => setTimeout(r, 20));
  }
}
