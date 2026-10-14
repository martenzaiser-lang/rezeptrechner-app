import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('API-Antworten und Zeitbegrenzung', () => {
  it.each(['lesen', 'speichern'])('bricht auch einen hängenden Antwortinhalt ab: %s', async mode => {
    vi.useFakeTimers();
    const activity = [];
    const listener = event => activity.push(event.detail.active);
    window.addEventListener('api-activity', listener);
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => ({
      status: 200, ok: true,
      text: () => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
    })));
    try {
      const request = mode === 'lesen' ? api.getRecipes() : api.putSettings({ name: 'Test' });
      const result = expect(request).rejects.toThrow(mode === 'lesen' ? 'nicht rechtzeitig' : 'Speicherstatus');
      await vi.advanceTimersByTimeAsync(1);
      expect(activity).toEqual([1]);
      await vi.advanceTimersByTimeAsync(90_000);
      await result;
      expect(activity).toEqual([1, 0]);
    } finally { window.removeEventListener('api-activity', listener); }
  });
  it('erhält ETag und vollständig gelesene Rezeptantwort', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recipes: [{ id: 'test' }] }), { headers: { ETag: '"v3"' } })));
    const res = await api.getRecipes();
    expect(res.headers.get('ETag')).toBe('"v3"');
    expect(await res.json()).toEqual({ recipes: [{ id: 'test' }] });
  });
  it('liest bei 304 keinen Inhalt und bewahrt Konfliktinformationen', async () => {
    const text = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 304, text })));
    expect(await api.getRecipes()).toEqual({ notModified: true });
    expect(text).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Rezept geändert","version":3}', { status: 409 })));
    await expect(api.updateRecipe('test', {})).rejects.toMatchObject({ status: 409, body: { version: 3 } });
  });
});
