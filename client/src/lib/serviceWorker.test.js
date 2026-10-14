// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker(network = async () => { throw new Error('offline'); }) {
  const origin = 'https://test.invalid';
  const current = 'rezeptrechner-shell-__BUILD_VERSION__';
  const stores = new Map([
    ['rezeptrechner-shell-alt', new Map([['/index.html', 'alte App'], ['/icon.png', 'altes Logo'], ['/assets/alt.js', 'alter Tab']])],
    [current, new Map([['/index.html', 'aktuelle App'], ['/icon.png', 'aktuelles Logo']])],
  ]);
  const key = request => new URL(typeof request === 'string' ? request : request.url, origin).pathname;
  const match = (cache, request) => cache.has(key(request)) ? new Response(cache.get(key(request))) : undefined;
  const listeners = {};
  const put = vi.fn();
  const caches = {
    open: async name => ({ match: async request => match(stores.get(name) || new Map(), request), put }),
    match: async request => { for (const cache of stores.values()) { const res = match(cache, request); if (res) return res; } },
  };
  vm.runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    self: { location: { origin }, addEventListener: (type, handler) => { listeners[type] = handler; } },
    caches, fetch: network, Response, URL,
  });
  return {
    put,
    request: (path, mode = 'cors') => {
      let response;
      listeners.fetch({ request: { url: origin + path, method: 'GET', mode }, respondWith: value => { response = value; } });
      return response;
    },
  };
}

describe('Offlinebetrieb über mehrere App-Versionen', () => {
  it('lädt offline die aktuelle Startseite trotz erhaltenem alten Cache', async () => {
    expect(await (await worker().request('/backen', 'navigate')).text()).toBe('aktuelle App');
  });
  it('bevorzugt das aktuelle Logo und unterstützt noch offene alte Tabs', async () => {
    const sw = worker();
    expect(await (await sw.request('/icon.png')).text()).toBe('aktuelles Logo');
    expect(await (await sw.request('/assets/alt.js')).text()).toBe('alter Tab');
  });
  it('vergiftet den Assetcache nicht mit einer SPA-HTML-Fehlerantwort', async () => {
    const sw = worker(async () => new Response('<html>Startseite</html>', { headers: { 'Content-Type': 'text/html' } }));
    await sw.request('/assets/fehlt.js');
    await Promise.resolve();
    expect(sw.put).not.toHaveBeenCalled();
  });
  it('fällt bei einer Serverstörung auf die aktuelle Offline-Version zurück', async () => {
    const sw = worker(async () => new Response('Wartung', { status: 503 }));
    expect(await (await sw.request('/verwaltung', 'navigate')).text()).toBe('aktuelle App');
  });
});
