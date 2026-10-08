import {useState, type FormEvent} from 'react';

export function ResetPasswordForm({name,busy,onReset}:{name:string;busy:boolean;onReset:(password:string)=>Promise<boolean>}){
 const [error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget;
  const values=new FormData(form);
  const password=String(values.get('password')||'');
  if(password!==values.get('confirmation')){setError('The passwords do not match.');return}
  setError('');
  if(await onReset(password))form.reset();
 }
 return <section className="password-reset-section">
  <h3>Reset user password</h3>
  <p>Set a new password for {name}. Their current sessions will be signed out. Share the new password with them securely.</p>
  <form onSubmit={submit}>
   <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required/></label>
   <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={200} required/></label>
   {error&&<p className="error" role="alert">{error}</p>}
   <button className="secondary" disabled={busy}>Reset password and sign out user</button>
  </form>
 </section>;
}
