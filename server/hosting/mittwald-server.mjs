// Frontend und API unter derselben Adresse. Der Testhinweis bleibt aktiv,
// bis MIGRATION_TEST_MODE ausdruecklich auf false gesetzt wird.
import express from 'express';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {app} from '../app.js';
import {config} from '../config.js';
const dist=fileURLToPath(new URL('../../client/dist/',import.meta.url));
const testMode=config.MIGRATION_TEST_MODE;
const original=readFileSync(new URL('../../client/dist/index.html',import.meta.url),'utf8');
const html=testMode?original
  .replace('<title>','<title>MITTWALD TEST – ')
  .replace('</head>','<meta name="robots" content="noindex,nofollow"><style>@media print{#mittwald-test-notice{display:none!important}}</style></head>')
  .replace('</body>','<div id="mittwald-test-notice" style="position:fixed;bottom:2px;left:50%;transform:translateX(-50%);z-index:99999;padding:2px 10px;border-radius:10px;background:#6b251d;color:#fff;font:10px system-ui;white-space:nowrap;pointer-events:none">MITTWALD TESTKOPIE · Kein produktiver Datenabgleich</div></body>'):original;
app.use((_req,res,next)=>{res.set('X-Robots-Tag','noindex, nofollow');next();});
app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
app.use('/api',(_req,res)=>res.status(404).json({error:'API-Endpunkt nicht gefunden'}));
app.get(['/','/index.html'],(_req,res)=>res.set('Cache-Control','no-store').type('html').send(html));
app.use(express.static(dist,{index:false,dotfiles:'deny',setHeaders(res,path){
  res.setHeader('Cache-Control',path.includes('/assets/')?'public, max-age=31536000, immutable':'no-cache');
}}));
app.get('*',(req,res)=>{
  if(req.path.includes('.')||!req.accepts('html'))return res.status(404).end();
  res.set('Cache-Control','no-store').type('html').send(html);
});
const server=app.listen(config.PORT,'0.0.0.0',()=>console.log(JSON.stringify({event:'mittwald_started',testMode})));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
