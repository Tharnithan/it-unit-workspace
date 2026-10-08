import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {createMySQLStore} from '../src/database/mysql-store.js';
import {mysqlConfig} from '../src/database/config.js';
import {seed,verify} from '../src/store.js';
import {createApp} from '../src/app.js';

test('MySQL stores API work, isolates concurrent requests, rolls back failures and survives reconnection',{skip:process.env.TEST_MYSQL!=='1'},async t=>{
 const database='it_unit_test_'+Date.now();
 const config=mysqlConfig({user:process.env.MYSQL_ADMIN_USER||'root',password:process.env.MYSQL_ADMIN_PASSWORD||'',database:undefined});
 const admin=await mysql.createConnection(config);let store;let server;
 try{
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  store=await createMySQLStore({...config,database},{initialize:true});
  const fixture=seed();fixture.users.forEach(u=>u.password=fixture.users[0].password);
  Object.assign(store.db,fixture);await store.save();
  server=createApp(store).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  async function call(path,method='GET',body,token){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()}}
  async function login(username,password='ITunit-demo-2026!'){const r=await call('/login','POST',{username,password});assert.equal(r.status,200);return r.body.token}
  const sdd=await login('itunit1');const employee=await login('itunit2');const administrator=await login('admin');
  const title="Network 'check'; SELECT * — පරීක්ෂණ 🔔";
  const task=await call('/tasks','POST',{title,description:'Integration test',assignee:'u1',division:'Laboratory Services',due:'2026-12-31',priority:'High'},sdd);
  assert.equal(task.status,201);
  const complete=await call('/tasks/'+task.body.id,'PATCH',{status:'Completed',note:'Verified on MySQL'},employee);assert.equal(complete.status,200);
  const [stored]=await admin.execute(`SELECT title,status,resolution FROM \`${database}\`.tasks WHERE id=?`,[task.body.id]);
  assert.equal(stored[0].title,title);assert.equal(stored[0].status,'Completed');assert.equal(stored[0].resolution,'Verified on MySQL');
  const [events]=await admin.execute(`SELECT * FROM \`${database}\`.task_events WHERE task_id=?`,[task.body.id]);assert.equal(events.length,2);
  const conversation=await call('/conversations','POST',{member:'u1'},sdd);assert.equal(conversation.status,200);
  const messages=await Promise.all(Array.from({length:6},(_,i)=>call('/messages','POST',{conversation:conversation.body.id,body:'Concurrent '+i},sdd)));
  assert.ok(messages.every(r=>r.status===201));
  const [count]=await admin.execute(`SELECT COUNT(*) AS total FROM \`${database}\`.messages WHERE conversation_id=?`,[conversation.body.id]);assert.equal(count[0].total,6);
  const meeting=await call('/meetings','POST',{title:'Database review',agenda:'Verify',start:'2026-12-10T04:30:00Z',location:'IT room',attendees:['u0','u1']},sdd);assert.equal(meeting.status,201);
  assert.equal((await call('/meetings/'+meeting.body.id,'PATCH',{response:'Accepted'},employee)).status,200);
  const newPassword='MySQL-reset-test-2026!';assert.equal((await call('/users/u1/password','POST',{password:newPassword},administrator)).status,200);
  assert.equal((await call('/workspace','GET',undefined,employee)).status,401);
  await login('itunit2',newPassword);
  assert.equal((await call('/users/u1','PATCH',{username:'itunit20'},sdd)).status,200);
  assert.equal((await call('/users/u1','PATCH',{username:'ITUNIT3'},administrator)).status,409);
  assert.equal((await call('/login','POST',{username:'itunit2',password:newPassword})).status,401);
  await login('itunit20',newPassword);
  await new Promise(resolve=>server.close(resolve));server=null;
  const before=store.db.tasks[0].assignee;store.db.tasks[0].assignee='missing-user';
  await assert.rejects(store.save());assert.equal(store.db.tasks[0].assignee,before);
  const originalName=store.db.users[0].name;
  store.db.users.push({...store.db.users[0],id:'duplicate-account',name:'Must not overwrite existing account'});
  await assert.rejects(store.save());
  assert.equal(store.db.users[0].name,originalName);
  const [original]=await admin.execute(`SELECT name FROM \`${database}\`.users WHERE id=?`,['u0']);
  assert.equal(original[0].name,originalName);
  await store.close();store=await createMySQLStore({...config,database});
  assert.equal(store.db.tasks.find(t=>t.id===task.body.id).status,'Completed');
  assert.equal(store.db.messages.filter(m=>m.conversation===conversation.body.id).length,6);
  assert.equal(store.db.meetings.find(m=>m.id===meeting.body.id).responses.u1,'Accepted');
  assert.ok(verify(newPassword,store.db.users.find(u=>u.id==='u1').password));
  assert.equal(store.db.users.find(u=>u.id==='u1').username,'itunit20');
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  await store?.close();
  if(!/^it_unit_test_\d+$/.test(database))throw new Error('Refusing to remove an unexpected database');
  await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);await admin.end();
 }
});
