import { it as test } from 'vitest';
import assert from 'node:assert/strict';
import { createMcpOwnerSession } from '../services/mcp-owner-session.cjs';

const service={id:2,email:'mcp@example.invalid',role:'admin',is_active:true};
const owner={id:1,email:'owner@example.invalid',role:'admin',is_active:true};
function fixture({actor=service,env={MCP_SERVICE_EMAIL:service.email,MCP_DELEGATED_OWNER_EMAIL:owner.email},users=[service,owner],fail=false}={}){
  const issued=[],audits=[],loaded=[];
  const run=createMcpOwnerSession({env,principal:req=>req.identity,
    loadUser:async email=>{loaded.push(email);if(fail)throw Error('database down');return users.find(u=>u.email===email);},
    signToken:async(target,source)=>{issued.push({target,source});return 'synthetic-token';},audit:async data=>audits.push(data)});
  const res={code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  return {issued,audits,loaded,res,call:()=>run({identity:actor,body:{email:'someone-else@example.invalid',userId:999},query:{ownerEmail:'attacker@example.invalid'}},res)};
}
test('MCP-Delegation bindet authentifizierten Dienst an konfigurierten Inhaber; Request kann Ziel nicht ändern',async()=>{
  const f=fixture();await f.call();assert.equal(f.res.code,200);assert.equal(f.res.body.user.id,owner.id);
  assert.equal(f.res.body.delegated,true);assert.deepEqual(f.loaded,[service.email,owner.email]);
  assert.equal(f.issued[0].source.id,service.id);assert.equal(f.audits[0].owner.id,owner.id);
});
test('Keine Freigabe ohne Konfiguration, für andere Admins, Mitarbeiter oder Geräte',async()=>{
  for(const options of [{env:{}},{env:{MCP_SERVICE_EMAIL:service.email,MCP_DELEGATED_OWNER_EMAIL:service.email}},
    {actor:null},{actor:{...service,role:'user'}},{actor:{...service,role:'print-agent'}},{actor:{...service,email:'other@example.invalid'}}]){
    const f=fixture(options);await f.call();assert.equal(f.res.code,403);assert.equal(f.loaded.length,0);assert.equal(f.issued.length,0);
  }
});
test('Gelöschte, deaktivierte oder herabgestufte Konten sperren die Delegation',async()=>{
  for(const users of [[owner],[service],[{...service,role:'user'},owner],[service,{...owner,role:'user'}],
    [{...service,is_active:false},owner],[service,{...owner,is_active:false}]]){
    const f=fixture({users});await f.call();assert.equal(f.res.code,403);assert.equal(f.issued.length,0);
  }
});
test('Datenbankfehler erzeugen keine Inhabersitzung',async()=>{const f=fixture({fail:true});await f.call();assert.equal(f.res.code,503);assert.equal(f.issued.length,0);});
