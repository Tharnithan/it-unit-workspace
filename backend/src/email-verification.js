import {randomInt} from 'node:crypto';
import {hash,verify,now,id} from './store.js';

export const officeEmail=value=>typeof value==='string'&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@slsi\.lk$/i.test(value)&&value.length<=200;
export const emailVerified=u=>!!u.emailVerification?.verifiedAt&&u.emailVerification.email===u.email?.trim().toLowerCase();
export function emailSender(){
 return {enabled:!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM),async send(to,code,purpose='verification'){
  const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),
   headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject:purpose==='recovery'?'Reset your IT Unit password':'Verify your IT Unit office email',
    text:`Your IT Unit ${purpose==='recovery'?'password recovery':'email verification'} code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`})});
  if(!response.ok)throw new Error('Email delivery failed');
 }};
}
export function registerEmailVerification(app,{db,save,error},sender){
 app.get('/api/email-verification', (req,res)=>res.json({email:req.user.email,verified:emailVerified(req.user),enabled:sender.enabled}));
 app.post('/api/email-verification/send',async(req,res)=>{
  const u=req.user,email=u.email?.trim().toLowerCase(),previous=u.emailVerification||{};
  if(!officeEmail(email))return error(res,400,'Ask the SDD or administrator to save your official @slsi.lk email in your profile.');
  if(db.users.some(other=>other.id!==u.id&&other.email?.trim().toLowerCase()===email))return error(res,409,'This mailbox is assigned to another account. Ask the administrator to correct it.');
  if(emailVerified(u))return res.json({verified:true});
  if(!sender.enabled)return error(res,503,'Office email delivery is not configured. Contact the administrator.');
  const time=Date.now(),windowStart=previous.windowStart||0;
  const sends=time-windowStart<3600000?(previous.sends||0):0;
  if(time-(previous.sentAt||0)<60000||sends>=5)return error(res,429,'Please wait before requesting another code. Maximum five codes per hour.');
  const code=String(randomInt(100000,1000000));
  // Persist limits before contacting the provider, including failed sends.
  u.emailVerification={email,codeHash:hash(code),expires:time+600000,attempts:0,sentAt:time,
   windowStart:sends?windowStart:time,sends:sends+1};
  await save();
  try{await sender.send(email,code)}catch{
   delete u.emailVerification.codeHash;await save();
   return error(res,503,'Could not send the code. Ask the administrator to check email delivery, then retry after one minute.');
  }
  res.json({sent:true,email});
 });
 app.post('/api/email-verification/confirm',async(req,res)=>{
  const u=req.user,v=u.emailVerification;
  if(!v?.codeHash||v.email!==u.email?.trim().toLowerCase()||Date.now()>=v.expires||v.attempts>=5)return error(res,400,'Code expired or unavailable. Request a new code.');
  v.attempts++;
  if(typeof req.body.code!=='string'||!/^\d{6}$/.test(req.body.code)||!verify(req.body.code,v.codeHash)){
   if(v.attempts>=5)delete v.codeHash;
   await save();return error(res,400,'Incorrect code. Check your latest email or request a new code.');
  }
  u.emailVerification={email:v.email,verifiedAt:now()};
  db.audit.push({id:id(),actor:u.id,action:'member.email_verified',record:u.id,at:now()});
  await save();res.json({verified:true});
 });
}
