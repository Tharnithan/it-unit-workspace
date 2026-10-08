import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {seed,verify} from '../src/store.js';

test('admin password reset enforces permissions, revokes access and preserves password secrecy',async t=>{
 const db=seed();let saves=0;
 const server=createApp({db,save(){saves++}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}/api`;
 async function call(path,method='GET',body,token){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
 }
 async function login(username,password='ITunit-demo-2026!'){return call('/login','POST',{username,password})}
 const admin=(await login('admin')).body.token;
 const sdd=(await login('itunit1')).body.token;
 const employee=(await login('itunit2')).body.token;
 const otherSession=(await login('itunit2')).body.token;
 const password='New-test-password-2026!';
 const oldHash=db.users.find(u=>u.id==='u1').password;
 assert.equal((await call('/users/u1/password','POST',{password})).status,401);
 for(const token of [sdd,employee])assert.equal((await call('/users/u1/password','POST',{password},token)).status,403);
 for(const invalid of ['short',' '.repeat(12),'x'.repeat(201),null,123])assert.equal((await call('/users/u1/password','POST',{password:invalid},admin)).status,400);
 assert.equal(db.users.find(u=>u.id==='u1').password,oldHash);
 assert.equal((await call('/users/missing/password','POST',{password},admin)).status,404);
 assert.equal((await call('/users/u11/password','POST',{password},admin)).status,400);
 db.pushSubscriptions=[{userId:'u1',subscription:{endpoint:'old-device'}},{userId:'u2',subscription:{endpoint:'other-device'}}];
 const before=saves;
 const result=await call('/users/u1/password','POST',{password},admin);
 assert.equal(result.status,200);assert.deepEqual(result.body,{ok:true});assert.equal(saves,before+1);
 assert.ok(verify(password,db.users.find(u=>u.id==='u1').password));
 for(const token of [employee,otherSession])assert.equal((await call('/workspace','GET',undefined,token)).status,401);
 assert.equal((await login('itunit2')).status,401);
 assert.equal((await login('itunit2',password)).status,200);
 assert.equal((await call('/workspace','GET',undefined,admin)).status,200);
 assert.deepEqual(db.pushSubscriptions.map(s=>s.userId),['u2']);
 assert.equal(db.audit.at(-1).action,'member.password_reset');
 assert.equal(db.audit.at(-1).actor,'u11');assert.equal(db.audit.at(-1).record,'u1');
 assert.ok(!JSON.stringify(db.audit).includes(password));
 assert.ok(!JSON.stringify((await call('/workspace','GET',undefined,admin)).body).includes(password));
});
