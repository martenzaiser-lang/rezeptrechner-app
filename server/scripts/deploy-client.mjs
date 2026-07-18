// Client-Deploy auf die Produktions-Site teigmaster.netlify.app.
//
// WARUM DIESES SKRIPT: Die Netlify-Site "teigmaster" (bb11dabb…) ist
// NICHT mit diesem Repo verbunden — ein git push deployt NICHTS.
// Am 17.07.2026 führte das zu einem veralteten Live-Stand, obwohl alles
// committet war. Deshalb kapselt dieses Skript den kompletten Weg:
//
//   1. Client-Build MIT VITE_API_URL (ohne die Variable würde der Build
//      relative /api-Pfade nutzen → auf Netlify kaputt)
//   2. Verifikation, dass die API-URL im Bundle steckt
//   3. netlify deploy --prod auf die richtige Site
//   4. Verifikation, dass die Live-Site das frische Bundle ausliefert
//
// Aufruf (Repo-Root):  npm run deploy:client
// Voraussetzung: netlify CLI eingeloggt (netlify status).

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const SITE_ID = 'bb11dabb-6614-4723-8943-39f069325da0'; // teigmaster
const SITE_URL = 'https://teigmaster.netlify.app';
const API_URL = process.env.VITE_API_URL || 'https://rezeptrechner-api.onrender.com';

function run(cmd, env) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

// 1. Build mit API-URL
run('npm run build --workspace client', { VITE_API_URL: API_URL });

// 2. Bundle-Verifikation (API-URL muss im Haupt-Bundle stehen)
const assets = readdirSync('client/dist/assets');
const hauptBundle = assets.find((f) => /^index-[\w-]+\.js$/.test(f));
if (!hauptBundle) throw new Error('Kein index-Bundle in client/dist/assets gefunden.');
const bundleInhalt = readFileSync(`client/dist/assets/${hauptBundle}`, 'utf8');
if (!bundleInhalt.includes(API_URL)) {
  throw new Error(`Bundle ${hauptBundle} enthält die API-URL ${API_URL} NICHT — Abbruch vor dem Deploy.`);
}
console.log(`Bundle-Check OK: ${hauptBundle} enthält ${API_URL}`);

// 3. Produktions-Deploy. --filter verhindert die interaktive
// Monorepo-Abfrage der CLI ("Select the project you want to work with"),
// die in nicht-interaktiven Shells haengen wuerde.
run(`netlify deploy --prod --dir client/dist --site ${SITE_ID} --filter @rezeptrechner/client --message "deploy-client.mjs"`);

// 4. Live-Verifikation: liefert die Site das frische Bundle aus?
const liveHtml = await (await fetch(`${SITE_URL}/?nocache=${Math.random()}`)).text();
if (!liveHtml.includes(hauptBundle)) {
  throw new Error(`Live-Site referenziert ${hauptBundle} noch nicht — Deploy prüfen (${SITE_URL}).`);
}
console.log(`\nLive-Check OK: ${SITE_URL} liefert ${hauptBundle} aus. Deploy vollständig.`);
