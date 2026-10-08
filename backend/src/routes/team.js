import {canManage,canWork,publicUser,hash,id,now,divisions} from '../store.js';
export function registerTeamRoutes(app,context){
 const {db,save,error,text,note,audit}=context;
 const validUsername=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(value);
 const usernameTaken=(username,exceptId)=>db.users.some(user=>user.id!==exceptId&&user.username.toLowerCase()===username.toLowerCase());
 app.post('/api/users/:id/password', async (req,res)=>{
  if(req.user.role!=='admin')return error(res,403,'Only the administrator can reset passwords');
  const user=db.users.find(user=>user.id===req.params.id);
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
  if(!canManage(req.user))return error(res,403,'Directory management access required');
  const u=db.users.find(u=>u.id===req.params.id);
  if(!u)return error(res,404,'Member not found');
  if(req.user.role!=='admin'&&(u.role==='admin'||req.body.role))return error(res,403,'Only the administrator can manage privileges');
  if(req.body.active===false&&u.id===req.user.id)return error(res,400,'You cannot deactivate your own account');
  if(req.body.username!==undefined){
   if(!validUsername(req.body.username))return error(res,400,'Username must start with a letter or number and contain only letters, numbers, dots, underscores or hyphens (maximum 200 characters)');
   if(usernameTaken(req.body.username,u.id))return error(res,409,'This username is already used by another account');
  }
  const usernameChanged=req.body.username!==undefined&&req.body.username!==u.username;
  for(const k of ['name','title','email','phone'])if(req.body[k]!==undefined)u[k]=text(req.body[k]);
  if(req.body.username!==undefined)u.username=req.body.username;
  if(req.body.active!==undefined)u.active=!!req.body.active;
  if(req.body.role&&['employee','sdd','admin'].includes(req.body.role))u.role=req.body.role;
  if(!u.active)db.sessions=db.sessions.filter(s=>s.userId!==u.id);
  if(usernameChanged)audit(req.user,'member.username_changed',u.id);
  audit(req.user,'member.updated',u.id);await save();res.json(publicUser(u));
 });
 app.post('/api/users',async (req,res)=>{if(!canManage(req.user))return error(res,403,'Directory management access required');const b=req.body;const username=text(b.username);if(!text(b.name)||!validUsername(b.username)||usernameTaken(username)||typeof b.password!=='string'||b.password.length<12||b.password.length>200)return error(res,400,'Provide a name, unique username and password of 12 to 200 characters');const u={id:id(),name:text(b.name),title:text(b.title),username,email:text(b.email),phone:text(b.phone),role:'employee',active:true,password:hash(b.password)};db.users.push(u);db.conversations.find(c=>c.id==='unit').members.push(u.id);audit(req.user,'member.created',u.id);await save();res.status(201).json(publicUser(u))});
}

