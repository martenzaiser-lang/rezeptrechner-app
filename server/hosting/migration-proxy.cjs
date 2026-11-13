'use strict';
// Separater Startbefehl fuer den kontrollierten Hosting-Wechsel. Kein DB-Zugriff,
// keine Hintergrundjobs, keine automatische Wiederholung schreibender Anfragen.
const http = require('node:http');
const https = require('node:https');

const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
function headersWithoutHop(headers) {
  const excluded = new Set([...HOP, ...String(headers.connection || '').toLowerCase().split(',').map(x => x.trim())]);
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !excluded.has(name.toLowerCase())));
}
function validateTarget(raw) {
  const url = new URL(raw);
  const localTest = process.env.NODE_ENV === 'test' && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if ((!localTest && url.protocol !== 'https:') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw Error('MIGRATION_PROXY_TARGET muss ein HTTPS-Origin ohne Zugangsdaten sein');
  }
  return url;
}
function createMigrationProxy({ mode, target, origins = [], timeoutMs = 120000 } = {}) {
  if (!['maintenance', 'forward'].includes(mode)) throw Error('MIGRATION_PROXY_MODE fehlt oder ist ungueltig');
  const destination = mode === 'forward' ? validateTarget(target) : null;
  const allowed = new Set(origins);
  function localResponse(req, res, status, body) {
    req.resume();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    if (allowed.has(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match, If-None-Match, X-API-Key, X-Request-ID');
    }
    if (status === 503) res.setHeader('Retry-After', '60');
    res.statusCode = status;
    res.end(req.method === 'HEAD' || status === 204 ? undefined : JSON.stringify(body));
  }
  const server = http.createServer((req, res) => {
    if (!req.url.startsWith('/') || req.url.startsWith('//') || req.headers.upgrade) {
      localResponse(req, res, 400, { error: 'invalid_proxy_request' });
      return;
    }
    if (mode === 'maintenance') {
      if (req.method === 'OPTIONS' && allowed.has(req.headers.origin)) {
        localResponse(req, res, 204); return;
      }
      const health = ['GET', 'HEAD'].includes(req.method) && ['/health', '/api/health'].includes(req.url.split('?')[0]);
      localResponse(req, res, health ? 200 : 503, health
        ? { status: 'maintenance', writingEnabled: false }
        : { error: 'migration_maintenance', message: 'Die App zieht gerade um. Bitte kurz warten; Eingaben wurden nicht gespeichert.' });
      return;
    }
    const headers = headersWithoutHop(req.headers);
    headers.host = destination.host;
    headers['x-forwarded-host'] = destination.host;
    headers['x-forwarded-proto'] = destination.protocol.slice(0, -1);
    const client = destination.protocol === 'https:' ? https : http;
    // Host ist ausschliesslich konfiguriert; auch ein manipulierter Request-Pfad
    // kann keine Weiterleitung an fremde Server erzeugen. TLS bleibt geprueft.
    const upstream = client.request({ protocol: destination.protocol, hostname: destination.hostname,
      port: destination.port || undefined, method: req.method, path: req.url, headers }, response => {
      res.writeHead(response.statusCode, headersWithoutHop(response.headers));
      response.on('error', () => res.destroy());
      response.pipe(res);
      res.on('close', () => { if (!res.writableEnded) response.destroy(); });
    });
    upstream.setTimeout(timeoutMs, () => upstream.destroy(Error('upstream_timeout')));
    upstream.on('error', () => {
      if (res.headersSent) { res.destroy(); return; }
      localResponse(req, res, 502, { error: 'migration_upstream_unavailable',
        message: 'Verbindung unterbrochen. Bei Änderungen zuerst den gespeicherten Stand prüfen, bevor du sie erneut sendest.' });
    });
    req.on('aborted', () => upstream.destroy());
    req.on('error', () => upstream.destroy());
    req.pipe(upstream);
  });
  return server;
}
module.exports = { createMigrationProxy, validateTarget };
if (require.main === module) {
  const origins = (process.env.MIGRATION_ALLOWED_ORIGINS || [process.env.CORS_ORIGIN, process.env.FRONTEND_URL].filter(Boolean).join(','))
    .split(',').map(x => x.trim()).filter(Boolean);
  const server = createMigrationProxy({ mode: process.env.MIGRATION_PROXY_MODE,
    target: process.env.MIGRATION_PROXY_TARGET, origins });
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(JSON.stringify({ event: 'migration_proxy_started', mode: process.env.MIGRATION_PROXY_MODE })));
  process.once('SIGTERM', () => { server.close(); setTimeout(() => server.closeAllConnections(), 5000).unref(); });
}
