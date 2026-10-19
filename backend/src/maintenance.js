import {id,now,canManage} from './store.js';
import {items,item,put,day} from './office-data.js';
import {writeBackup} from './backups.js';
export function nextDate(value,frequency){const d=new Date(value+'T00:00:00Z');if(frequency==='Monthly'){const n=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(n,end))}else d.setUTCDate(d.getUTCDate()+(frequency==='Weekly'?7:1));return d.toISOString().slice(0,10)}
export async function maintain(store,context,at=Date.now()){
 const {db,save}=store,{note,audit}=context,today=day(at);let changed=false;
 for(const s of items(db,'schedule').filter(s=>s.active&&s.nextDate<=today)){
  if(!db.users.some(u=>u.id===s.assignee&&u.active)||!db.users.some(u=>u.id===s.createdBy&&u.active&&canManage(u)))continue;
  // One catch-up assignment per schedule after downtime, rather than a burst of duplicates.
  const key=s.id+':'+s.nextDate;
  if(!item(db,'occurrence',key)){const t={id:id(),title:s.title,description:s.description,assignee:s.assignee,division:s.division,priority:s.priority,due:new Date(Date.parse(today)+s.dueDays*86400000).toISOString().slice(0,10),status:'Assigned',progress:0,createdAt:now(),createdBy:s.createdBy,completedAt:null,completedBy:null,resolution:'',updates:[],events:[{status:'Assigned',at:now(),actor:s.createdBy,assignee:s.assignee}]};db.tasks.push(t);put(db,'occurrence',key,{taskId:t.id});note([t.assignee],'Recurring task assigned',t.title);audit({id:s.createdBy},'schedule.generated',t.id)}
  let count=0;do{s.nextDate=nextDate(s.nextDate,s.frequency)}while(s.nextDate<=today&&++count<40000);changed=true;
 }
 for(const t of db.tasks.filter(t=>!t.deleted&&t.status!=='Completed')){
  const days=Math.round((Date.parse(t.due)-Date.parse(today))/86400000);if(days>1||item(db,'approval',t.id)?.status==='Pending')continue;
  const key=t.id+':'+t.due+':'+today;if(item(db,'reminder',key))continue;
  const recipients=days<0?[t.assignee,...db.users.filter(u=>u.active&&canManage(u)).map(u=>u.id)]:[t.assignee];
  note(recipients,days<0?'Task overdue':days===0?'Task due today':'Task due tomorrow',t.priority+' priority: '+t.title);put(db,'reminder',key,{at:now()});changed=true;
 }
 if(changed)await save();
 if(process.env.BACKUP_DIR&&process.env.BACKUP_KEY&&item(db,'system','backup')?.day!==today){await writeBackup(db,process.env.BACKUP_DIR,process.env.BACKUP_KEY);put(db,'system','backup',{day:today,at:now()});await save()}
}
export function startMaintenance(store,context){let running=false;const run=async()=>{if(running)return;running=true;let release;try{release=await store.acquire?.();await maintain(store,context)}catch(e){console.error('Workspace maintenance:',e.message)}finally{release?.();running=false}};void run();const timer=setInterval(()=>void run(),60000);timer.unref();return()=>clearInterval(timer)}
