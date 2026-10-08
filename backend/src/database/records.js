import {createHash} from 'node:crypto';
import {tables} from './model.js';

const sqlDate=value=>value==null?null:new Date(value).toISOString().replace('T',' ').replace('Z','');
const iso=value=>value==null?null:new Date(value.replace(' ','T')+'Z').toISOString();
const hash=value=>createHash('sha256').update(value).digest('hex');
export function toRecords(db){
 const rows=Object.fromEntries(tables.map(t=>[t.name,[]]));
 for(const [position,u] of db.users.entries())rows.users.push({id:u.id,name:u.name,designation:u.title,role:u.role,username:u.username,email:u.email||'',phone:u.phone||'',active:Number(u.active),password_hash:u.password,position});
 for(const [position,t] of db.tasks.entries()){
  rows.tasks.push({id:t.id,title:t.title,description:t.description||'',division:t.division,assignee_id:t.assignee,status:t.status,progress:Number(t.progress),priority:t.priority,due_date:t.due,created_at:sqlDate(t.createdAt),created_by:t.createdBy,completed_at:sqlDate(t.completedAt),completed_by:t.completedBy||null,resolution:t.resolution||'',completion_employee_name:t.completionSnapshot?.name||null,completion_division:t.completionSnapshot?.division||null,deleted:Number(!!t.deleted),position});
  for(const [i,u] of (t.updates||[]).entries())rows.task_updates.push({task_id:t.id,position:i,id:u.id||`${t.id}-${i}`,actor_id:u.actor,note:u.note||'',progress:Number(u.progress),status:u.status,created_at:sqlDate(u.at)});
  for(const [i,e] of (t.events||[]).entries())rows.task_events.push({task_id:t.id,position:i,status:e.status,created_at:sqlDate(e.at),actor_id:e.actor,assignee_id:e.assignee});
 }
 for(const [position,c] of db.conversations.entries()){
  rows.conversations.push({id:c.id,name:c.name||'',type:c.type,position});
  [...new Set(c.members)].forEach((user_id,position)=>rows.conversation_members.push({conversation_id:c.id,user_id,position}));
 }
 for(const [position,m] of db.messages.entries())rows.messages.push({id:m.id,conversation_id:m.conversation,sender_id:m.sender,body:m.body,sent_at:sqlDate(m.at),edited_at:sqlDate(m.editedAt),position});
 for(const [position,m] of db.meetings.entries()){
  rows.meetings.push({id:m.id,title:m.title,agenda:m.agenda||'',starts_at:sqlDate(m.start),location:m.location||'',created_by:m.createdBy,cancelled:Number(!!m.cancelled),position});
  [...new Set(m.attendees)].forEach((user_id,position)=>rows.meeting_attendees.push({meeting_id:m.id,user_id,response:m.responses?.[user_id]||null,position}));
 }
 for(const [position,n] of db.notifications.entries())rows.notifications.push({id:n.id,recipient_id:n.recipient,title:n.title,body:n.body||'',is_read:Number(!!n.read),created_at:sqlDate(n.at),position});
 for(const [position,a] of db.audit.entries())rows.audit_log.push({id:a.id,actor_id:a.actor,action:a.action,record_id:a.record,created_at:sqlDate(a.at),position});
 for(const [position,s] of db.sessions.entries())rows.sessions.push({token:s.token,user_id:s.userId,expires_at:sqlDate(s.expires),position});
 for(const [position,s] of (db.pushSubscriptions||[]).entries())rows.push_subscriptions.push({endpoint_hash:hash(s.subscription.endpoint),user_id:s.userId,endpoint:s.subscription.endpoint,p256dh:s.subscription.keys.p256dh,auth:s.subscription.keys.auth,expiration_time:s.subscription.expirationTime??null,position});
 for(const [position,n] of (db.pushOutbox||[]).entries())rows.push_outbox.push({id:n.id,recipient_id:n.recipient,title:n.title,attempts:n.attempts,next_attempt_at:sqlDate(n.next),position});
 return rows;
}
export function fromRecords(rows){
 const db={users:[],tasks:[],conversations:[],messages:[],meetings:[],notifications:[],audit:[],sessions:[],pushSubscriptions:[],pushOutbox:[]};
 db.users=rows.users.map(u=>({id:u.id,name:u.name,title:u.designation,role:u.role,username:u.username,email:u.email,phone:u.phone,active:!!u.active,password:u.password_hash}));
 db.tasks=rows.tasks.map(t=>({id:t.id,title:t.title,description:t.description,division:t.division,assignee:t.assignee_id,status:t.status,progress:Number(t.progress),priority:t.priority,due:t.due_date,createdAt:iso(t.created_at),createdBy:t.created_by,completedAt:iso(t.completed_at),completedBy:t.completed_by,resolution:t.resolution,deleted:!!t.deleted,...(t.completion_employee_name?{completionSnapshot:{name:t.completion_employee_name,division:t.completion_division}}:{}),updates:rows.task_updates.filter(u=>u.task_id===t.id).map(u=>({id:u.id,actor:u.actor_id,note:u.note,progress:Number(u.progress),status:u.status,at:iso(u.created_at)})),events:rows.task_events.filter(e=>e.task_id===t.id).map(e=>({status:e.status,at:iso(e.created_at),actor:e.actor_id,assignee:e.assignee_id}))}));
 db.conversations=rows.conversations.map(c=>({id:c.id,name:c.name,type:c.type,members:rows.conversation_members.filter(m=>m.conversation_id===c.id).map(m=>m.user_id)}));
 db.messages=rows.messages.map(m=>({id:m.id,conversation:m.conversation_id,sender:m.sender_id,body:m.body,at:iso(m.sent_at),...(m.edited_at?{editedAt:iso(m.edited_at)}:{})}));
 db.meetings=rows.meetings.map(m=>({id:m.id,title:m.title,agenda:m.agenda,start:iso(m.starts_at),location:m.location,createdBy:m.created_by,cancelled:!!m.cancelled,attendees:rows.meeting_attendees.filter(a=>a.meeting_id===m.id).map(a=>a.user_id),responses:Object.fromEntries(rows.meeting_attendees.filter(a=>a.meeting_id===m.id&&a.response).map(a=>[a.user_id,a.response]))}));
 db.notifications=rows.notifications.map(n=>({id:n.id,recipient:n.recipient_id,title:n.title,body:n.body,read:!!n.is_read,at:iso(n.created_at)}));
 db.audit=rows.audit_log.map(a=>({id:a.id,actor:a.actor_id,action:a.action,record:a.record_id,at:iso(a.created_at)}));
 db.sessions=rows.sessions.map(s=>({token:s.token,userId:s.user_id,expires:Date.parse(iso(s.expires_at))}));
 db.pushSubscriptions=rows.push_subscriptions.map(s=>({userId:s.user_id,subscription:{endpoint:s.endpoint,expirationTime:s.expiration_time==null?null:Number(s.expiration_time),keys:{p256dh:s.p256dh,auth:s.auth}}}));
 db.pushOutbox=rows.push_outbox.map(n=>({id:n.id,recipient:n.recipient_id,title:n.title,attempts:n.attempts,next:Date.parse(iso(n.next_attempt_at))}));
 return db;
}
