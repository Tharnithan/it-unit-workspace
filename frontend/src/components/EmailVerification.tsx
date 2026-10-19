import {useState} from 'react';
type Props={email:string;verified?:boolean;request:(path:string,method?:string,body?:unknown)=>Promise<any>;onVerified:()=>void};
export function EmailVerification({email,verified,request,onVerified}:Props){
 const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 async function run(confirm:boolean){setBusy(true);setError('');setMessage('');try{
  const result=await request('/email-verification/'+(confirm?'confirm':'send'),'POST',confirm?{code}:{});
  if(result.verified){setCode('');setMessage('Your office email is verified.');onVerified()}else setMessage('Code sent. Check your inbox and spam folder. It expires in 10 minutes.');
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="card settings-card"><h2>Office email verification</h2><p>{email||'No office email has been saved. Ask the SDD or administrator to update your profile.'}</p>
 {verified?<p role="status">Verified</p>:<><p>Verify ownership of your saved @slsi.lk mailbox.</p><button type="button" className="secondary" disabled={busy||!email} onClick={()=>void run(false)}>Send verification code</button>
 <form onSubmit={e=>{e.preventDefault();void run(true)}}><label>Six-digit code<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label><button className="primary" disabled={busy||code.length!==6}>Verify email</button></form></>}
 {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error">{error}</p>}</section>;
}
