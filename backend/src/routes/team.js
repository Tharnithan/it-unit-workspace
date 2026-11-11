import {officeEmail} from '../email-verification.js';
import {canManage,canManageMembers,memberDeleted,memberRoles,publicUser,hash,id} from '../store.js';
export function registerTeamRoutes(app,context){
 const {db,save,error,text,note,audit}=context;
 const validUsername=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(value);
 const usernameTaken=(username,exceptId)=>db.users.some(user=>user.id!==exceptId&&user.username.toLowerCase()===username.toLowerCase());
 const findMember=id=>db.users.find(user=>user.id===id&&!memberDeleted(user));
 const canManageAccount=(actor,target)=>actor.role==='admin'||(target.role!=='admin'&&(actor.role==='sdd'||target.role!=='sdd'));
 app.post('/api/users/:id/password', async (req,res)=>{
  if(req.user.role!=='admin')return error(res,403,'Only the administrator can reset passwords');
  const user=findMember(req.params.id);
  if(!user)return error(res,404,'Member not found');
  if(user.id===req.user.id)return error(res,400,'Change your own password in Settings');
  const password=req.body.password;
  if(typeof password!=='string'||password.length<12||password.length>200||!password.trim())return error(res,400,'Enter a password of 12 to 200 characters');
  user.password=hash(password);
  db.sessions=db.sessions.filter(session=>session.userId!==user.id);
  db.pushSubscriptions=(db.pushSubscriptions||[]).filter(subscription=>subscription.userId!==user.id);
  audit(req.user,'member.password_reset',user.id);
  await save();
  res.json({ok:true});
 });
 app.patch('/api/users/:id',async (req,res)=>{
  const statusOnly=Object.keys(req.body).length===1&&typeof req.body.active==='boolean';
  if(!(statusOnly?canManageMembers(req.user):canManage(req.user)))return error(res,403,'Directory management access required');
  const u=findMember(req.params.id);
  if(!u)return error(res,404,'Member not found');
  if(!canManageAccount(req.user,u)||(req.user.role!=='admin'&&req.body.role))return error(res,403,'Account management access denied');
  if(req.body.active!==undefined&&typeof req.body.active!=='boolean')return error(res,400,'Choose an active or inactive status');
  if(req.body.active===false&&u.id===req.user.id)return error(res,400,'You cannot deactivate your own account');
  if(req.body.username!==undefined){
   if(!validUsername(req.body.username))return error(res,400,'Username must start with a letter or number and contain only letters, numbers, dots, underscores or hyphens (maximum 200 characters)');
   if(usernameTaken(req.body.username,u.id))return error(res,409,'This username is already used by another account');
  }
  if(req.body.email!==undefined&&text(req.body.email)&&!officeEmail(text(req.body.email)))return error(res,400,'Use an official @slsi.lk email address');
  if(req.body.email!==undefined&&text(req.body.email).toLowerCase()!==u.email?.trim().toLowerCase()){delete u.emailVerification;db.sessions=db.sessions.filter(s=>s.userId!==u.id||s.token===req.token)}
  const usernameChanged=req.body.username!==undefined&&req.body.username!==u.username;
  for(const k of ['name','title','email','phone'])if(req.body[k]!==undefined)u[k]=text(req.body[k]);
  if(req.body.username!==undefined)u.username=req.body.username;
  if(req.body.active!==undefined)u.active=!!req.body.active;
  if(req.body.role&&['employee','sdd','admin'].includes(req.body.role))u.role=req.body.role;
  if(!u.active)db.sessions=db.sessions.filter(s=>s.userId!==u.id);
  if(usernameChanged)audit(req.user,'member.username_changed',u.id);
  audit(req.user,'member.updated',u.id);await save();res.json(publicUser(u));
 });
 app.delete('/api/users/:id',async (req,res)=>{
  if(!canManageMembers(req.user))return error(res,403,'Directory management access required');
  const member=findMember(req.params.id);
  if(!member)return error(res,404,'Member not found');
  if(!canManageAccount(req.user,member))return error(res,403,'Account management access denied');
  if(member.id===req.user.id)return error(res,400,'You cannot delete your own account');
  // Keep the user ID for existing task, meeting, message and audit references.
  Object.assign(member,{name:'Former member',title:'',username:'!deleted-'+member.id,email:'',phone:'',password:'',active:false,role:'employee'});
  delete member.emailVerification;
  db.sessions=db.sessions.filter(session=>session.userId!==member.id);
  db.pushSubscriptions=(db.pushSubscriptions||[]).filter(subscription=>subscription.userId!==member.id);
  audit(req.user,'member.deleted',member.id);
  await save();
  res.json({ok:true});
 });
 app.post('/api/users',async (req,res)=>{if(!canManageMembers(req.user))return error(res,403,'Directory management access required');const b=req.body;if(text(b.email)&&!officeEmail(text(b.email)))return error(res,400,'Use an official @slsi.lk email address');const username=text(b.username),title=text(b.title);if(!memberRoles.includes(title))return error(res,400,'Choose a member role');if(!validUsername(b.username)||usernameTaken(username)||typeof b.password!=='string'||b.password.length<12||b.password.length>200)return error(res,400,'Provide a unique username and password of 12 to 200 characters');const u={id:id(),name:title,title,username,email:text(b.email),phone:text(b.phone),role:'employee',active:true,password:hash(b.password)};db.users.push(u);db.conversations.find(c=>c.id==='unit').members.push(u.id);audit(req.user,'member.created',u.id);await save();res.status(201).json(publicUser(u))});
}

