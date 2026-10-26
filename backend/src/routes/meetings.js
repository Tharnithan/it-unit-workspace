import {item,put} from '../office-data.js';
import {canManage,canWork,publicUser,hash,id,now,divisions} from '../store.js';
export function registerMeetingsRoutes(app,context){
 const {db,save,error,text,note,audit}=context;
 const visible=(u,m)=>m&&(canManage(u)||m.attendees.includes(u.id));
 const record=m=>{const n=item(db,'meetingNotes',m.id);return {meeting:{...m},attendees:m.attendees.map(id=>({id,name:db.users.find(u=>u.id===id)?.name||'Former member',response:m.responses[id]||'Pending'})),notes:{summary:n?.summary||'',decisions:n?.decisions||'',actions:n?.actions||'',version:n?.version||0,updatedAt:n?.updatedAt||null,updatedBy:db.users.find(u=>u.id===n?.updatedBy)?.name||null}}};
 app.get('/api/meetings/:id/record',(req,res)=>{const m=db.meetings.find(m=>m.id===req.params.id);if(!visible(req.user,m))return error(res,404,'Meeting not found');res.setHeader('Cache-Control','no-store');res.json(record(m))});
 app.put('/api/meetings/:id/record',async(req,res)=>{
  if(!canManage(req.user))return error(res,403,'Only SDD or Admin can save meeting notes');
  const m=db.meetings.find(m=>m.id===req.params.id);if(!m)return error(res,404,'Meeting not found');const b=req.body;
  for(const [key,max] of [['summary',12000],['decisions',8000],['actions',8000]])if(typeof b[key]!=='string'||b[key].length>max)return error(res,400,'Enter valid meeting notes within the displayed limits');
  const previous=item(db,'meetingNotes',m.id);if(!Number.isInteger(b.version)||b.version!==(previous?.version||0))return error(res,409,'These notes changed. Reload the saved record before editing again.');
  put(db,'meetingNotes',m.id,{summary:b.summary.trim(),decisions:b.decisions.trim(),actions:b.actions.trim(),version:b.version+1,updatedBy:req.user.id,updatedAt:now()});
  audit(req.user,'meeting.notes.updated',m.id);note(m.attendees,'Meeting summary updated',m.title);await save();res.json(record(m));
 });

 app.put('/api/meetings/:id',async (req,res)=>{if(!canManage(req.user))return error(res,403,'Meeting management access required');const m=db.meetings.find(m=>m.id===req.params.id);if(!m)return error(res,404,'Meeting not found');const b=req.body;if(!text(b.title)||!Number.isFinite(Date.parse(b.start)))return error(res,400,'Enter a title and valid date');m.title=text(b.title);m.agenda=text(b.agenda,4000);m.location=text(b.location,500);m.start=new Date(b.start).toISOString();note(m.attendees,'Meeting updated',m.title);audit(req.user,'meeting.updated',m.id);await save();res.json(m)});
 app.delete('/api/meetings/:id',async (req,res)=>{if(req.user.role!=='admin')return error(res,403,'Administrator access required');const m=db.meetings.find(m=>m.id===req.params.id);if(!m)return error(res,404,'Meeting not found');note(m.attendees,'Meeting removed',m.title);db.meetings=db.meetings.filter(m=>m.id!==req.params.id);audit(req.user,'meeting.removed',m.id);await save();res.json({ok:true})});
 app.post('/api/meetings',async (req,res)=>{if(!canManage(req.user))return error(res,403,'Only the SDD or administrator can schedule meetings');const b=req.body;if(!text(b.title)||!Number.isFinite(Date.parse(b.start))||!Array.isArray(b.attendees)||!b.attendees.length||b.attendees.some(x=>!db.users.some(u=>u.id===x&&u.active)))return error(res,400,'Enter a title, valid date and attendees');const m={id:id(),title:text(b.title),agenda:text(b.agenda,4000),start:new Date(b.start).toISOString(),location:text(b.location,500),attendees:b.attendees,responses:{},createdBy:req.user.id,cancelled:false};db.meetings.push(m);note(m.attendees,'Meeting invitation',m.title);audit(req.user,'meeting.created',m.id);await save();res.status(201).json(m)});
 app.patch('/api/meetings/:id',async (req,res)=>{const m=db.meetings.find(m=>m.id===req.params.id);if(!m)return error(res,404,'Meeting not found');if(req.body.cancelled===true){if(!canManage(req.user))return error(res,403,'Organizer access required');m.cancelled=true;note(m.attendees,'Meeting cancelled',m.title)}else {if(!m.attendees.includes(req.user.id)||!['Accepted','Declined'].includes(req.body.response))return error(res,403,'Invalid attendance response');m.responses[req.user.id]=req.body.response}await save();res.json(m)});
}

