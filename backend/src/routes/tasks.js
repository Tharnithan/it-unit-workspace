import {publicTask,put,item,items,validDay} from '../office-data.js';
import {accountRole,canManageTasks,canWork,taskAssignees,taskDivisions,id,now,divisions} from '../store.js';
export function registerTasksRoutes(app,context){
 const {db,save,error,text,note,audit}=context;
 app.get('/api/tasks/ended',(req,res)=>{
  const month=typeof req.query.month==='string'?req.query.month:'';
  if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return error(res,400,'Use a month in YYYY-MM format');
  const offset=Number(req.query.offset||0),limit=Number(req.query.limit||20);
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>100)return error(res,400,'Invalid pagination');
  const query=text(req.query.search,200).toLowerCase();
  const monthOf=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit'}).format(new Date(value));
  const tasks=db.tasks.filter(t=>!t.deleted&&t.status==='Completed'&&t.completedAt&&canWork(req.user,t))
   .filter(t=>!month||monthOf(t.completedAt)===month)
   .filter(t=>!query||[t.title,...taskDivisions(t),t.resolution,...db.users.filter(u=>taskAssignees(t).includes(u.id)).map(accountRole)].join(' ').toLowerCase().includes(query))
   .sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)||a.id.localeCompare(b.id));
  res.json({tasks:tasks.slice(offset,offset+limit).map(task=>publicTask(db,task)),total:tasks.length,offset,limit});
 });

 function activeAssignees(values){
  return Array.isArray(values)&&values.length>0&&values.every(id=>db.users.some(u=>u.id===id&&u.active));
 }
 function assign(task,assignees,supportedDivisions){
  task.assignees=[...new Set(assignees)];
  task.divisions=[...new Set(supportedDivisions)];
  [task.assignee]=task.assignees;
  [task.division]=task.divisions;
  put(db,'taskAssignment',task.id,{assignees:task.assignees,divisions:task.divisions});
 }
 app.post('/api/tasks',async(req,res)=>{
  if(!canManageTasks(req.user))return error(res,403,'Task assignment access required');
  const b=req.body,assignees=b.assignees??[b.assignee],supportedDivisions=b.divisions??[b.division];
  if(!text(b.title)||!activeAssignees(assignees)||!Array.isArray(supportedDivisions)||!supportedDivisions.length||
    !supportedDivisions.every(division=>divisions.includes(division))||!validDay(b.due)||!['Low','Medium','High'].includes(b.priority))
   return error(res,400,'Enter a title, active assignees, divisions, priority and due date');
  const at=now();
  const t={id:id(),title:text(b.title),description:text(b.description,5000),due:b.due,priority:b.priority,
   status:'Assigned',progress:0,createdAt:at,createdBy:req.user.id,completedAt:null,completedBy:null,resolution:'',updates:[],events:[]};
  assign(t,assignees,supportedDivisions);
  t.events.push({status:t.status,at,actor:req.user.id,assignee:t.assignee});
  db.tasks.push(t);
  note(t.assignees,'New task assigned',t.title,undefined,{taskId:t.id});
  audit(req.user,'task.created',t.id);
  await save();
  res.status(201).json(t);
 });
 app.post('/api/tasks/:id/reassign',async(req,res)=>{
  if(!canManageTasks(req.user))return error(res,403,'Task reassignment access required');
  const t=db.tasks.find(t=>t.id===req.params.id&&!t.deleted);
  if(!t)return error(res,404,'Task not found');
  if(t.status==='Completed')return error(res,409,'Reopen the task before reassigning it');
  const b=req.body,details=text(b.details,2500),reason=text(b.reason,1500);
  const processor=db.users.find(u=>u.id===b.processor&&(taskAssignees(t).includes(u.id)||t.updates.some(update=>update.actor===u.id)));
  if(!activeAssignees(b.assignees)||!details||!reason||!processor)return error(res,400,'Select active assignees and the person who processed the task, and enter the work done and reason');
  const previous=taskAssignees(t);
  if(previous.length===new Set(b.assignees).size&&previous.every(id=>b.assignees.includes(id)))return error(res,400,'Change the assigned people');
  const names=ids=>ids.map(id=>accountRole(db.users.find(u=>u.id===id))).join(', ');
  assign(t,b.assignees,taskDivisions(t));
  const at=now();
  t.status='Assigned';
  put(db,'approval',t.id,{status:'Open',note:'',reviewNote:''});
  const handover=['Reassigned from '+names(previous)+' to '+names(t.assignees),'Processed by: '+accountRole(processor),'Work done: '+details,'Reason: '+reason];
  t.updates.push({id:id(),actor:req.user.id,note:handover.join('\n'),progress:t.progress,status:t.status,at});
  t.events.push({status:t.status,at,actor:req.user.id,assignee:t.assignee});
  note(t.assignees,'Task reassigned',t.title,undefined,{taskId:t.id});
  audit(req.user,'task.reassigned',t.id);
  await save();
  res.json(publicTask(db,t));
 });
 app.patch('/api/tasks/:id',async (req,res)=>{const t=db.tasks.find(t=>t.id===req.params.id&&!t.deleted);if(!t)return error(res,404,'Task not found');if(!canWork(req.user,t))return error(res,403,'You cannot update this task');const b=req.body;if(t.status==='Completed'&&b.status!=='Assigned')return error(res,409,'Reopen the task before updating it');if(t.status==='Completed'&&!canManageTasks(req.user))return error(res,403,'Task management access required');if(b.status&&!['Assigned','In Progress','Blocked','Completed'].includes(b.status))return error(res,400,'Invalid task status');if(b.progress!==undefined&&(!Number.isFinite(b.progress)||b.progress<0||b.progress>100))return error(res,400,'Progress must be between 0 and 100');if(b.status==='Completed'&&!text(b.note,5000))return error(res,400,'A resolution note is required');if(b.status==='Assigned'&&t.status==='Completed'&&!text(b.note))return error(res,400,'A reopening reason is required');if(b.assignee!==undefined&&b.assignee!==t.assignee)return error(res,400,'Use Reassign task to record the handover');if(b.due!==undefined&&(!canManageTasks(req.user)||!validDay(b.due)))return error(res,400,'Only management can set a valid due date');if(b.priority!==undefined&&(!canManageTasks(req.user)||!['Low','Medium','High'].includes(b.priority)))return error(res,400,'Only management can change priority');
 const previous={assignee:t.assignee,due:t.due,priority:t.priority,status:t.status};
 if(b.status==='Completed'&&!canManageTasks(req.user)){
  if(item(db,'approval',t.id)?.status==='Pending')return error(res,409,'Your completion is already awaiting review');
  put(db,'approval',t.id,{status:'Pending',note:text(b.note,5000),submittedBy:req.user.id,submittedAt:now(),reviewedAt:null,reviewNote:''});t.status='In Progress';t.progress=100;t.updates.push({id:id(),actor:req.user.id,note:'Submitted for approval: '+text(b.note,5000),progress:100,status:'Awaiting approval',at:now()});
  note(db.users.filter(u=>u.active&&canManageTasks(u)).map(u=>u.id),'Completion awaiting approval',t.title);audit(req.user,'task.submitted',t.id);await save();return res.json(publicTask(db,t));
 }
 if(item(db,'approval',t.id)?.status==='Pending')return error(res,409,'Review the pending completion before editing this task');
 if(b.due)t.due=b.due;if(b.priority)t.priority=b.priority;
 if(b.status)t.status=b.status;if(b.progress!==undefined)t.progress=b.progress;if(b.status==='Completed'){t.progress=100;t.completedAt=now();t.completedBy=req.user.id;t.resolution=text(b.note,5000);t.completionSnapshot={name:accountRole(db.users.find(u=>u.id===req.user.id)),division:t.division}}else if(b.status==='Assigned'){t.completedAt=null;t.completedBy=null}t.updates.push({id:id(),actor:req.user.id,note:text(b.note,5000),progress:t.progress,status:t.status,at:now()});t.events.push({status:t.status,at:now(),actor:req.user.id,assignee:t.assignee});note([...taskAssignees(t),...db.users.filter(u=>u.role==='sdd').map(u=>u.id)].filter(x=>x!==req.user.id),'Task updated',t.title+' · '+t.status);if(b.status==='Assigned')put(db,'approval',t.id,{status:'Open'});
 for(const r of items(db,'request').filter(r=>r.taskId===t.id)){r.status=t.status==='Completed'?'Resolved':'Assigned';note([r.requester],'Service request updated',r.number+': '+r.status)}
 if(previous.due!==t.due||previous.assignee!==t.assignee||previous.priority!==t.priority)t.updates.push({id:id(),actor:req.user.id,note:'Assignment/deadline/priority changed from '+JSON.stringify(previous),progress:t.progress,status:t.status,at:now()});
 audit(req.user,'task.updated',t.id);await save();res.json(publicTask(db,t))});
 app.delete('/api/tasks/:id',async (req,res)=>{if(req.user.role!=='admin')return error(res,403,'Administrator access required');const t=db.tasks.find(t=>t.id===req.params.id);if(!t)return error(res,404,'Task not found');t.deleted=true;audit(req.user,'task.removed',t.id);await save();res.json({ok:true})});
}

