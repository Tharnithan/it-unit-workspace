import {add,items,targetAllowed,attachmentInfo,item} from '../office-data.js';
import {canManage} from '../store.js';
const limit=2*1024*1024;
const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',pdf:'application/pdf',txt:'text/plain',csv:'text/csv'};
export function registerAttachments(app,{db,save,error,audit}){
 app.get('/api/attachments',(req,res)=>{const {type,key}=req.query;if(!targetAllowed(db,req.user,type,key))return error(res,404,'Record not found');res.json(items(db,'attachment').filter(a=>a.targetType===type&&a.targetId===key).map(attachmentInfo))});
 app.post('/api/attachments',async(req,res)=>{
  const b=req.body;if(!targetAllowed(db,req.user,b.targetType,b.targetId))return error(res,404,'Record not found');
  if(b.targetType==='conversation'&&item(db,'conversation',b.targetId)?.announcement&&!canManage(req.user))return error(res,403,'Only management can attach announcement files');
  if(typeof b.name!=='string'||typeof b.data!=='string'||b.data.length>Math.ceil(limit/3)*4||!b.data||!/^[A-Za-z0-9+/]*={0,2}$/.test(b.data))return error(res,400,'Choose a file up to 2 MB');
  const name=b.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120),ext=name.split('.').pop()?.toLowerCase(),data=Buffer.from(b.data,'base64');
  if(!mime[ext]||!data.length||data.length>limit)return error(res,400,'Use PNG, JPEG, PDF, TXT or CSV, up to 2 MB');
  if(ext==='png'&&!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||['jpg','jpeg'].includes(ext)&&!(data[0]===255&&data[1]===216&&data[2]===255)||ext==='pdf'&&data.subarray(0,5).toString()!=='%PDF-')return error(res,400,'File content does not match its extension');
  if(['txt','csv'].includes(ext)&&data.includes(0))return error(res,400,'Text files must contain text');
  const all=items(db,'attachment');if(all.reduce((n,a)=>n+a.size,0)+data.length>100*1024*1024)return error(res,409,'Workspace file storage reached 100 MB. Ask an administrator to remove unneeded files');
  if(all.filter(a=>a.targetType===b.targetType&&a.targetId===b.targetId).length>=20)return error(res,409,'This record already has 20 files');
  const a=add(db,'attachment',{targetType:b.targetType,targetId:b.targetId,name,mime:mime[ext],size:data.length,data:data.toString('base64'),actor:req.user.id});audit(req.user,'attachment.created',a.id);await save();res.status(201).json(attachmentInfo(a));
 });
 app.get('/api/attachments/:id',async(req,res)=>{const a=items(db,'attachment').find(a=>a.id===req.params.id);if(!a||!targetAllowed(db,req.user,a.targetType,a.targetId))return error(res,404,'File not found');audit(req.user,'attachment.downloaded',a.id);await save();res.setHeader('Content-Type',a.mime);res.setHeader('Content-Disposition','attachment; filename="'+a.name+'"');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.send(Buffer.from(a.data,'base64'))});
 app.delete('/api/attachments/:id',async(req,res)=>{const a=items(db,'attachment').find(a=>a.id===req.params.id);if(!a||!targetAllowed(db,req.user,a.targetType,a.targetId))return error(res,404,'File not found');if(a.actor!==req.user.id&&!canManage(req.user))return error(res,403,'Only the uploader or management can remove this file');db.workspaceItems=db.workspaceItems.filter(x=>x.id!==a.id);audit(req.user,'attachment.removed',a.id);await save();res.json({ok:true})});
}
