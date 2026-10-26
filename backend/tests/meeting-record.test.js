import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../src/app.js';
import {createStore} from '../src/store.js';
import {toRecords,fromRecords} from '../src/database/records.js';

test('meeting notes restrict access, prevent stale edits and survive database restart',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'meeting-notes-')),path=join(dir,'test.sqlite');let store=createStore(path);
 store.db.meetings=[{id:'meeting-test',title:'Service review',agenda:'Review requests',location:'Room 1',start:'2026-10-20T04:00:00.000Z',attendees:['u1'],responses:{u1:'Accepted'},createdBy:'u0',cancelled:false}];
 store.db.sessions=['u0','u1','u2','u11'].map(userId=>({token:userId,userId,expires:Date.now()+600000}));store.save();
 const app=createApp(store),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 t.after(async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true})});
 const call=async(user,method='GET',body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/meetings/meeting-test/record',{method,headers:{Authorization:'Bearer '+user,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}};
 assert.equal((await call('none')).status,401);assert.equal((await call('u2')).status,404);
 const initial=await call('u1');assert.equal(initial.data.notes.version,0);assert.equal(initial.data.meeting.agenda,'Review requests');
 const notes={version:0,summary:'Reviewed support requests.\nNetwork restored.',decisions:'Replace switch',actions:'Insaf — test network — 30 October'};
 assert.equal((await call('u1','PUT',notes)).status,403);
 assert.equal((await call('u0','PUT',{...notes,summary:'a'.repeat(12001)})).status,400);
 const saved=await call('u0','PUT',notes);assert.equal(saved.status,200);assert.equal(saved.data.notes.version,1);
 assert.equal((await call('u11','PUT',notes)).status,409);
 assert.equal((await call('u1')).data.notes.summary,notes.summary);
 assert(store.db.notifications.some(n=>n.recipient==='u1'&&n.title==='Meeting summary updated'));
 assert(store.db.audit.some(a=>a.action==='meeting.notes.updated'));
 const roundtrip=fromRecords(toRecords(store.db));assert.equal(roundtrip.workspaceItems.find(n=>n.kind==='meetingNotes').actions,notes.actions);
 store.close();store=createStore(path);assert.equal(store.db.workspaceItems.find(n=>n.kind==='meetingNotes').summary,notes.summary);
});
