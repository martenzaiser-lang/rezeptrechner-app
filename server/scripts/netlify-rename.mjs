// Einmalskript: Netlify-Site umbenennen (CLI-Escaping unter PowerShell 5.1
// ist unzuverlaessig, daher direkt ueber die CLI-API mit JSON-Datei).
import { execSync } from 'node:child_process';

const data = JSON.stringify({ site_id: 'd9ab5db6-6bb2-4024-a20d-3c322fae6f32', body: { name: 'teigmaster-neu' } });
const out = execSync(`netlify api updateSite --data "${data.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
const site = JSON.parse(out);
console.log(site.name, '→', site.ssl_url);
