import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {seed} from '../src/store.js';
import {toRecords,fromRecords} from '../src/database/records.js';

test('assignment alerts belong to the assignee and keep their task link and read status after reload',async t=>{
 const db=seed();
 const server=createApp({db,save(){}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}/api`;
 async function call(path,token,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 const login=async username=>(await call('/login',null,'POST',{username,password:'ITunit-demo-2026!'})).data.token;
 const sdd=await login('itunit1'),admin=await login('admin'),employee=await login('itunit2'),other=await login('itunit3');
 const body={title:'Same title',assignee:'u1',division:'Metrology',due:'2026-12-01',priority:'High'};
 const first=await call('/tasks',sdd,'POST',body),second=await call('/tasks',admin,'POST',body);
 assert.equal(first.status,201);assert.equal(second.status,201);
 let workspace=(await call('/workspace',employee)).data;
 const alerts=workspace.notifications.filter(n=>n.taskId);assert.equal(alerts.length,2);
 assert.deepEqual(new Set(alerts.map(n=>n.taskId)),new Set([first.data.id,second.data.id]));
 assert.ok(alerts.every(n=>!n.read));
 assert.equal((await call('/workspace',other)).data.notifications.some(n=>n.taskId),false);
 await call('/notifications',other,'PATCH',{id:alerts[0].id});
 assert.equal(db.notifications.find(n=>n.id===alerts[0].id).read,false);
 await call('/notifications',employee,'PATCH',{id:alerts[0].id});
 Object.assign(db,fromRecords(toRecords(db)));
 workspace=(await call('/workspace',employee)).data;
 assert.equal(workspace.notifications.find(n=>n.id===alerts[0].id).read,true);
 assert.equal(workspace.notifications.find(n=>n.id===alerts[1].id).read,false);
 assert.equal(workspace.notifications.find(n=>n.id===alerts[1].id).taskId,alerts[1].taskId);
 await call('/tasks/'+second.data.id,sdd,'PATCH',{assignee:'u2'});
 assert.equal((await call('/workspace',employee)).data.notifications.find(n=>n.id===alerts[1].id).taskId,undefined);
 await call('/tasks/'+first.data.id,admin,'DELETE');
 assert.equal((await call('/workspace',employee)).data.notifications.find(n=>n.id===alerts[0].id).taskId,undefined);
});
