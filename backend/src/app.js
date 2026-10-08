import {registerTasksRoutes} from './routes/tasks.js';
import {registerChatRoutes} from './routes/chat.js';
import {registerMeetingsRoutes} from './routes/meetings.js';
import {registerTeamRoutes} from './routes/team.js';
import {registerNotificationsRoutes} from './routes/notifications.js';
import express from 'express';import helmet from 'helmet';import rateLimit from 'express-rate-limit';import {randomBytes} from 'node:crypto';
import {canManage,canWork,publicUser,verify,hash,id,now,divisions} from './store.js';
import {setupPush} from './push.js';
export function createApp(store){const app=express();const {db,save}=store;
 const push=setupPush(store);app.locals.push=push;
 app.use(helmet());app.use(express.json({limit:'100kb'}));app.use('/api',rateLimit({windowMs:60000,limit:300}));
 // Serialize each unit of work and reload committed MySQL data before authorization.
 app.use('/api',async (req,res,next)=>{
  if(!store.acquire)return next();
  try{
   const release=await store.acquire();
   let released=false;
   const done=()=>{if(!released){released=true;release()}};
   // A disconnected client must not release the lock during an outstanding save.
   res.once('finish',done);
   const originalEnd=res.end;
   res.end=function(...args){try{return originalEnd.apply(this,args)}finally{if(res.destroyed)done()}};
   next();
  }catch(e){next(e)}
 });
 const error=(res,status,message)=>res.status(status).json({error:message});
 const note=(recipients,title,body)=>{for(const recipient of new Set(recipients)){const n={id:id(),recipient,title,body,read:false,at:now()};db.notifications.push(n);push.queue(n)}};
 const audit=(u,action,record)=>db.audit.push({id:id(),actor:u.id,action,record,at:now()});
 const text=(x,max=200)=>typeof x==='string'?x.trim().slice(0,max):'';
 app.get('/api/health',(_,res)=>res.json({status:'ok'}));
 app.post('/api/login',rateLimit({windowMs:900000,limit:25}), async (req,res)=>{const u=db.users.find(u=>u.username===req.body.username&&u.active);if(!u||typeof req.body.password!=='string'||req.body.password.length>200||!verify(req.body.password,u.password))return error(res,401,'Invalid username or password');const token=randomBytes(32).toString('hex');db.sessions.push({token,userId:u.id,expires:Date.now()+8*3600000});await save();res.json({token,user:publicUser(u)})});
 app.use('/api',(req,res,next)=>{const token=req.headers.authorization?.replace(/^Bearer /,'');const s=db.sessions.find(s=>s.token===token&&s.expires>Date.now());const u=s&&db.users.find(u=>u.id===s.userId&&u.active);if(!u)return error(res,401,'Please sign in again');req.user=u;req.token=token;next()});
 app.post('/api/logout',async (req,res)=>{db.sessions=db.sessions.filter(s=>s.token!==req.token);await save();res.json({ok:true})});
 app.get('/api/push/config',(_,res)=>res.json({enabled:push.enabled,publicKey:process.env.VAPID_PUBLIC_KEY||''}));
 app.post('/api/push/subscribe',async (req,res)=>{const s=req.body.subscription;let hostname;try{const url=new URL(s?.endpoint);if(url.protocol!=='https:')throw Error();hostname=url.hostname}catch{return error(res,400,'Invalid push subscription')}
 const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','notify.windows.com'];if(!allowed.some(h=>hostname===h||hostname.endsWith('.'+h))||!s.keys?.p256dh||!s.keys?.auth)return error(res,400,'Unsupported push service');if(!push.enabled)return error(res,409,'Configure server VAPID keys first');db.pushSubscriptions=db.pushSubscriptions.filter(x=>x.subscription.endpoint!==s.endpoint);db.pushSubscriptions.push({userId:req.user.id,subscription:s});await save();res.json({ok:true})});
 app.delete('/api/push/subscribe',async (req,res)=>{db.pushSubscriptions=db.pushSubscriptions.filter(s=>s.userId!==req.user.id||s.subscription.endpoint!==req.body.endpoint);await save();res.json({ok:true})});
 app.get('/api/workspace',async (req,res)=>{const u=req.user;const conversations=db.conversations.filter(c=>c.members.includes(u.id));res.json({user:publicUser(u),users:db.users.map(publicUser),divisions,tasks:db.tasks.filter(t=>canWork(u,t)&&!t.deleted),meetings:db.meetings.filter(m=>canManage(u)||m.attendees.includes(u.id)),conversations,messages:db.messages.filter(m=>conversations.some(c=>c.id===m.conversation)),notifications:db.notifications.filter(n=>n.recipient===u.id),audit:u.role==='admin'?db.audit:[]})});
 app.post('/api/password',async (req,res)=>{if(typeof req.body.current!=='string'||!verify(req.body.current,req.user.password)||typeof req.body.password!=='string'||req.body.password.length<12||req.body.password.length>200)return error(res,400,'Enter your current password and a new password of 12 to 200 characters');req.user.password=hash(req.body.password);db.sessions=db.sessions.filter(s=>s.userId!==req.user.id||s.token===req.token);await save();res.json({ok:true})});
 const context={db,save,error,text,note,audit};
 registerTasksRoutes(app,context);
 registerChatRoutes(app,context);
 registerMeetingsRoutes(app,context);
 registerTeamRoutes(app,context);
 registerNotificationsRoutes(app,context);
 app.use((err,req,res,next)=>{console.error(err.message);error(res,500,'The request could not be completed')});return app;
}

