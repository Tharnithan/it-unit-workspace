import {randomInt} from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {hash,verify} from './store.js';
import {emailVerified} from './email-verification.js';
import {put,item} from './office-data.js';
export function registerRecovery(app,{db,save,error,audit},sender){
 const limit=rateLimit({windowMs:900000,limit:15});
 app.post('/api/recovery/send',limit,async(req,res)=>{
  const email=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():'';
  const matches=db.users.filter(u=>u.active&&emailVerified(u)&&u.email.toLowerCase()===email),u=matches.length===1?matches[0]:null;
  if(u&&sender.enabled){const old=item(db,'recovery',u.id),time=Date.now();if(!old||time-old.sentAt>=60000){const code=String(randomInt(100000,1000000));put(db,'recovery',u.id,{email,codeHash:hash(code),expires:time+600000,sentAt:time,attempts:0});await save();try{await sender.send(email,code,'recovery')}catch{const current=item(db,'recovery',u.id);delete current.codeHash;await save()}}}
  res.json({message:'If an active account has this verified office email, a recovery code has been sent. Contact the administrator if it does not arrive.'});
 });
 app.post('/api/recovery/confirm',limit,async(req,res)=>{
  const b=req.body,email=typeof b.email==='string'?b.email.trim().toLowerCase():'';const matches=db.users.filter(u=>u.active&&emailVerified(u)&&u.email.toLowerCase()===email),u=matches.length===1?matches[0]:null,r=u&&item(db,'recovery',u.id);
  if(!r?.codeHash||r.email!==email||r.expires<=Date.now()||r.attempts>=5)return error(res,400,'Code invalid or expired');
  r.attempts++;if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code)||!verify(b.code,r.codeHash)){await save();return error(res,400,'Code invalid or expired')}
  if(typeof b.password!=='string'||b.password.length<12||b.password.length>200)return error(res,400,'Choose a password of 12 to 200 characters');
  u.password=hash(b.password);delete r.codeHash;db.sessions=db.sessions.filter(s=>s.userId!==u.id);db.pushSubscriptions=(db.pushSubscriptions||[]).filter(s=>s.userId!==u.id);audit(u,'member.password_recovered',u.id);await save();res.json({ok:true});
 });
}
