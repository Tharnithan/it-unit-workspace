import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../src/app.js';
import {seed,createStore,verify} from '../src/store.js';
import {items,item,quietNow,put} from '../src/office-data.js';
import {toRecords,fromRecords} from '../src/database/records.js';
import {maintain,nextDate} from '../src/maintenance.js';
import {encryptBackup,decryptBackup,writeBackup} from '../src/backups.js';

async function fixture(t,mailer){const db=seed(),store={db,save(){}},app=createApp(store,mailer?{mailer}:{}),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port+'/api';const call=async(path,token,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()}};const login=async username=>(await call('/login',null,'POST',{username,password:'ITunit-demo-2026!'})).data.token;return {db,store,app,call,employee:await login('itunit2'),other:await login('itunit3'),sdd:await login('itunit1'),admin:await login('admin')}}

test('service request assignment, approval, assets, guides and private attachments enforce roles',async t=>{
 const {db,call,employee,other,sdd}=await fixture(t);
 assert.equal((await call('/assets',employee,'POST',{name:'No'})).status,403);
 const asset=(await call('/assets',sdd,'POST',{name:'Laptop',serial:'SLSI-1',assignee:'u1',warranty:'2027-01-01'})).data;
 assert.equal((await call('/assets',sdd,'POST',{name:'Duplicate',serial:'SLSI-1'})).status,409);
 assert.equal((await call('/office',other)).data.assets.length,0);
 const request=(await call('/requests',employee,'POST',{title:'Network outage',description:'Cannot connect',division:'Laboratory Services',category:'Network',assetId:asset.id})).data;
 assert.match(request.number,/^IT-/);assert.equal((await call('/office',other)).data.requests.length,0);
 assert.equal((await call('/requests/'+request.id+'/assign',employee,'POST',{})).status,403);
 const task=(await call('/requests/'+request.id+'/assign',sdd,'POST',{assignee:'u1',priority:'High',due:'2026-12-01'})).data;
 assert.equal((await call('/requests/'+request.id+'/assign',sdd,'POST',{assignee:'u1',priority:'High',due:'2026-12-01'})).status,409);
 assert.equal((await call('/tasks/'+task.id,employee,'PATCH',{status:'Completed',note:'Cable replaced'})).status,200);
 assert.equal(db.tasks.find(t=>t.id===task.id).completedAt,null);
 assert.equal((await call('/tasks/ended',employee)).data.tasks.some(t=>t.id===task.id),false);
 assert.equal((await call('/tasks/'+task.id+'/review',employee,'POST',{decision:'Approve',note:'Self approval'})).status,403);
 assert.equal((await call('/tasks/'+task.id+'/review',sdd,'POST',{decision:'Changes requested',note:'Test connectivity'})).status,200);
 assert.equal((await call('/tasks/'+task.id,employee,'PATCH',{status:'Completed',note:'Connectivity tested'})).status,200);
 assert.equal((await call('/tasks/'+task.id+'/review',sdd,'POST',{decision:'Approve',note:'Verified'})).status,200);
 assert.equal((await call('/office',employee)).data.requests[0].status,'Resolved');
 assert.equal((await call('/tasks/ended',employee)).data.tasks.some(t=>t.id===task.id),true);
 const file=(await call('/attachments',employee,'POST',{targetType:'task',targetId:task.id,name:'evidence.txt',data:Buffer.from('evidence').toString('base64')})).data;
 assert.equal((await call('/attachments/'+file.id,other)).status,404);assert.equal((await call('/attachments/'+file.id,employee)).data,'evidence');
 assert.equal((await call('/attachments',employee,'POST',{targetType:'task',targetId:task.id,name:'fake.png',data:Buffer.from('not PNG').toString('base64')})).status,400);
 assert.equal((await call('/attachments',employee,'POST',{targetType:'task',targetId:task.id,name:'attack.html',data:Buffer.from('<script>').toString('base64')})).status,400);
 await call('/tasks/'+task.id+'/comments',employee,'POST',{body:'Repair evidence attached'});
 assert.equal((await call('/tasks/'+task.id+'/details',other)).status,404);
 assert.equal((await call('/tasks/'+task.id+'/details',sdd)).data.comments.length,1);
 const article=(await call('/articles',sdd,'POST',{title:'Guide',body:'Restart network adapter',published:false})).data;
 assert.equal((await call('/office',employee)).data.articles.length,0);
 await call('/articles/'+article.id,sdd,'PUT',{title:'Guide',body:'Approved instructions',published:true});
 assert.equal((await call('/office',employee)).data.articles[0].version,2);
 assert.equal(items(db,'articleRevision').length,1);
 const round=fromRecords(toRecords(db));assert.deepEqual(round.workspaceItems,db.workspaceItems);
});

test('chat replies, search, read markers, reactions, mentions, task channels and announcements stay private',async t=>{
 const {db,call,employee,other,sdd,admin}=await fixture(t);
 const c=(await call('/conversations',sdd,'POST',{member:'u1'})).data;
 const m=(await call('/messages',sdd,'POST',{conversation:c.id,body:'Private repair note',mentions:['u1']})).data;
 assert.equal((await call('/messages/search?q=repair',other)).data.length,0);
 assert.equal((await call('/messages/search?q=repair',employee)).data.length,1);
 assert.equal((await call('/messages',employee,'POST',{conversation:c.id,body:'Reply',replyTo:'msg1'})).status,400);
 const reply=(await call('/messages',employee,'POST',{conversation:c.id,body:'Confirmed',replyTo:m.id})).data;assert.equal(reply.replyTo,m.id);
 assert.equal((await call('/messages/'+m.id+'/actions',other,'PATCH',{action:'reaction',reaction:'👍'})).status,404);
 await call('/messages/'+m.id+'/actions',employee,'PATCH',{action:'reaction',reaction:'👍'});assert.deepEqual(item(db,'message',m.id).reactions['👍'],['u1']);
 await call('/messages/'+m.id+'/actions',employee,'PATCH',{action:'reaction',reaction:'👍'});assert.deepEqual(item(db,'message',m.id).reactions['👍'],[]);
 assert.equal((await call('/messages/'+m.id+'/actions',employee,'PATCH',{action:'pin'})).status,403);
 await call('/messages/'+m.id+'/actions',sdd,'PATCH',{action:'pin'});assert.equal(item(db,'message',m.id).pinned,true);
 await call('/conversations/'+c.id+'/read',employee,'POST',{lastId:reply.id});assert.equal((await call('/workspace',employee)).data.conversations.find(v=>v.id===c.id).unread,0);
 const announcement=(await call('/announcements',sdd,'POST',{})).data;
 assert.equal((await call('/messages',employee,'POST',{conversation:announcement.id,body:'Unauthorized notice'})).status,403);
 const notice=(await call('/messages',sdd,'POST',{conversation:announcement.id,body:'Planned maintenance'})).data;
 await call('/messages/'+notice.id+'/actions',employee,'PATCH',{action:'acknowledge'});await call('/messages/'+notice.id+'/actions',employee,'PATCH',{action:'acknowledge'});assert.deepEqual(item(db,'message',notice.id).acknowledged,['u1']);
 const taskChat=(await call('/tasks/t0/conversation',employee,'POST',{})).data;
 assert.equal((await call('/messages',other,'POST',{conversation:taskChat.id,body:'No access'})).status,403);
 await call('/tasks/t0',sdd,'PATCH',{assignee:'u2',note:'Reassign'});
 assert.equal((await call('/messages',employee,'POST',{conversation:taskChat.id,body:'Lost access'})).status,403);
 assert.equal((await call('/messages',other,'POST',{conversation:taskChat.id,body:'New assignee'})).status,201);
 assert.equal((await call('/preferences',employee,'PUT',{muted:[c.id],quietStart:'22:00',quietEnd:'07:00',availability:'Busy'})).status,200);
 assert.equal((await call('/preferences',other,'PUT',{muted:[c.id],quietStart:'',quietEnd:'',availability:'Available'})).status,400);
 const workspace=(await call('/workspace',employee)).data;assert.equal('workspaceItems'in workspace,false);assert.equal(workspace.users.some(u=>'password'in u),false);
 await call('/admin/messages',admin);assert.ok(db.audit.some(a=>a.action==='messages.moderation_view'));
});

test('recurrence and reminders are idempotent; backup restores data and rejects tampering',async t=>{
 const {db,store,app,call,sdd}=await fixture(t);const previousDir=process.env.BACKUP_DIR;delete process.env.BACKUP_DIR;t.after(()=>{if(previousDir!==undefined)process.env.BACKUP_DIR=previousDir});
 const s=(await call('/schedules',sdd,'POST',{title:'Weekly check',description:'Inspect',assignee:'u1',division:'Metrology',priority:'High',nextDate:'2026-10-19',frequency:'Weekly',dueDays:1})).data;
 const at=Date.parse('2026-10-19T06:00:00Z');await maintain(store,app.locals.context,at);const count=db.tasks.length,notifications=db.notifications.length;await maintain(store,app.locals.context,at);assert.equal(db.tasks.length,count);assert.equal(db.notifications.length,notifications);assert.equal(items(db,'schedule').find(x=>x.id===s.id).nextDate,'2026-10-26');
 assert.equal(nextDate('2026-01-31','Monthly'),'2026-02-28');assert.equal(quietNow({quietStart:'22:00',quietEnd:'07:00'},Date.parse('2026-10-19T18:00:00Z')),true);
 const secret='a'.repeat(64),bytes=encryptBackup(db,secret),restored=decryptBackup(bytes,secret);assert.equal(restored.sessions.length,0);assert.equal(restored.tasks.length,db.tasks.length);assert.throws(()=>decryptBackup(bytes,'b'.repeat(64)));
 const tamper=JSON.parse(bytes);tamper.data=Buffer.from('tampered').toString('base64');assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(tamper)),secret));
 const dir=mkdtempSync(join(tmpdir(),'office-restore-'));try{await writeBackup(db,dir,secret);let local=createStore(join(dir,'restored.sqlite'));Object.assign(local.db,restored);local.save();local.close();local=createStore(join(dir,'restored.sqlite'));assert.deepEqual(local.db.workspaceItems,restored.workspaceItems);assert.deepEqual(local.db.tasks,restored.tasks);local.close()}finally{rmSync(dir,{recursive:true,force:true})}
});

test('password recovery requires a verified unique email, consumes codes and revokes sessions',async t=>{
 let code;const {db,call,employee}=await fixture(t,{enabled:true,async send(to,value,purpose){assert.equal(purpose,'recovery');code=value}});
 const u=db.users.find(u=>u.id==='u1');u.email='tester@slsi.lk';u.emailVerification={email:u.email,verifiedAt:new Date().toISOString()};
 const a=await call('/recovery/send',null,'POST',{email:'missing@slsi.lk'});const b=await call('/recovery/send',null,'POST',{email:u.email});assert.deepEqual(a.data,b.data);assert.ok(code);
 assert.equal((await call('/recovery/confirm',null,'POST',{email:u.email,code:'000000',password:'A-new-password-2026!'})).status,400);
 assert.equal((await call('/recovery/confirm',null,'POST',{email:u.email,code,password:'A-new-password-2026!'})).status,200);
 assert.ok(verify('A-new-password-2026!',u.password));assert.equal((await call('/workspace',employee)).status,401);
 assert.equal((await call('/recovery/confirm',null,'POST',{email:u.email,code,password:'Another-password-2026!'})).status,400);
});
