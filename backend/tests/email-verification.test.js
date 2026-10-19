import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {seed,publicUser} from '../src/store.js';
import {toRecords,fromRecords} from '../src/database/records.js';

test('office verification persists, limits retries, gates access and resets after email change',async t=>{
 const previous=process.env.EMAIL_VERIFICATION_REQUIRED;process.env.EMAIL_VERIFICATION_REQUIRED='true';
 t.after(()=>{if(previous===undefined)delete process.env.EMAIL_VERIFICATION_REQUIRED;else process.env.EMAIL_VERIFICATION_REQUIRED=previous});
 const db=seed();db.users[1].email='itunit2@slsi.lk';let delivered;let fail=false;
 const app=createApp({db,save(){}},{mailer:{enabled:true,async send(to,code){if(fail)throw Error('provider failure');delivered={to,code}}}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}/api`;
 async function call(path,body,token,method='POST'){
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};
 }
 const login=async username=>(await call('/login',{username,password:'ITunit-demo-2026!'})).data.token;
 const token=await login('itunit2'),admin=await login('admin');
 assert.equal((await call('/email-verification/send',{})).status,401);
 assert.equal((await call('/workspace',null,token,'GET')).data.verificationRequired,true);
 assert.equal((await call('/email-verification/send',{},token)).status,200);
 assert.equal(delivered.to,'itunit2@slsi.lk');assert.match(delivered.code,/^\d{6}$/);
 assert.equal((await call('/email-verification/send',{},token)).status,429);
 assert.equal(publicUser(db.users[1]).emailVerification,undefined);
 const restored=fromRecords(toRecords(db));assert.deepEqual(restored.users[1].emailVerification,db.users[1].emailVerification);
 for(let i=0;i<5;i++)assert.equal((await call('/email-verification/confirm',{code:'000000'},token)).status,400);
 assert.equal((await call('/email-verification/confirm',{code:delivered.code},token)).status,400);
 db.users[1].emailVerification.sentAt-=61000;
 await call('/email-verification/send',{},token);db.users[1].emailVerification.expires=Date.now()-1;
 assert.equal((await call('/email-verification/confirm',{code:delivered.code},token)).status,400);
 db.users[1].emailVerification.sentAt-=61000;
 await call('/email-verification/send',{},token);
 assert.equal((await call('/email-verification/confirm',{code:delivered.code},token)).status,200);
 assert.equal((await call('/email-verification/confirm',{code:delivered.code},token)).status,400);
 assert.equal((await call('/workspace',null,token,'GET')).status,200);
 assert.equal(publicUser(db.users[1]).emailVerified,true);
 assert.equal(fromRecords(toRecords(db)).users[1].emailVerification.verifiedAt,db.users[1].emailVerification.verifiedAt);
 assert.equal((await call('/users/u1',{email:'outside@example.com'},admin,'PATCH')).status,400);
 assert.equal((await call('/users/u1',{email:'new@slsi.lk'},admin,'PATCH')).status,200);
 assert.equal(publicUser(db.users[1]).emailVerified,false);
 assert.equal((await call('/workspace',null,token,'GET')).status,401);
 const newToken=await login('itunit2');fail=true;
 assert.equal((await call('/email-verification/send',{},newToken)).status,503);
 assert.equal(db.users[1].emailVerification.codeHash,undefined);
 assert.equal((await call('/email-verification/send',{},newToken)).status,429);
});
