import {id,now,canManage,canWork} from './store.js';

export function items(db,kind){db.workspaceItems??=[];return db.workspaceItems.filter(x=>x.kind===kind)}
export function item(db,kind,key){return items(db,kind).find(x=>x.key===key)}
export function put(db,kind,key,value){let record=item(db,kind,key);if(!record){record={id:id(),kind,key};db.workspaceItems.push(record)}Object.assign(record,value);return record}
export function add(db,kind,value){const record={id:id(),kind,at:now(),...value};db.workspaceItems??=[];db.workspaceItems.push(record);return record}
export const day=(at=Date.now())=>new Date(Number(at)+330*60000).toISOString().slice(0,10);
export const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function conversationAllowed(db,u,c){
 if(!c)return false;
 const meta=item(db,'conversation',c.id);
 if(meta?.taskId){const t=db.tasks.find(t=>t.id===meta.taskId&&!t.deleted);return !!t&&canWork(u,t)}
 if(meta?.announcement)return true;
 return c.members.includes(u.id);
}
export function targetAllowed(db,u,type,key){
 if(type==='task')return db.tasks.some(t=>t.id===key&&!t.deleted&&canWork(u,t));
 if(type==='conversation')return conversationAllowed(db,u,db.conversations.find(c=>c.id===key));
 if(type==='request')return items(db,'request').some(r=>r.id===key&&(r.requester===u.id||canManage(u)));
 return false;
}
export function preferences(db,userId){return item(db,'preferences',userId)||{muted:[],quietStart:'',quietEnd:'',availability:'Available'}}
export function quietNow(p,at=Date.now()){
 if(!p.quietStart||!p.quietEnd||p.quietStart===p.quietEnd)return false;
 const time=new Date(at+330*60000).toISOString().slice(11,16);
 return p.quietStart<p.quietEnd?time>=p.quietStart&&time<p.quietEnd:time>=p.quietStart||time<p.quietEnd;
}
export function notifyAllowed(db,userId,conversationId){const p=preferences(db,userId);return !(conversationId&&p.muted?.includes(conversationId))&&!quietNow(p)}
export function publicMessage(db,m){const meta=item(db,'message',m.id)||{};return {...m,replyTo:meta.replyTo||'',mentions:meta.mentions||[],reactions:meta.reactions||{},pinned:!!meta.pinned,acknowledged:meta.acknowledged||[]}}
export function publicConversation(db,u,c){const meta=item(db,'conversation',c.id)||{},read=item(db,'read',u.id+':'+c.id);return {...c,...((meta.taskId||meta.announcement)?{members:db.users.filter(v=>v.active&&conversationAllowed(db,v,c)).map(v=>v.id)}:{}),...(meta.taskId?{taskId:meta.taskId}:{}),announcement:!!meta.announcement,unread:db.messages.filter(m=>m.conversation===c.id&&m.sender!==u.id&&(!read||Date.parse(m.at)>Date.parse(read.at))).length}}
export function attachmentInfo(a){const {data,...info}=a;return info}
