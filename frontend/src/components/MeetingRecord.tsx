import {useEffect,useState} from 'react';
import {FileText,Printer} from 'lucide-react';
import {Modal} from './ui';
import type {Meeting} from '../types';
import type {Request} from '../office-types';
import {meetingPrintHtml} from '../meeting-print';

export type MeetingDocument={meeting:Meeting;attendees:{id:string;name:string;response:string}[];notes:{summary:string;decisions:string;actions:string;version:number;updatedAt:string|null;updatedBy:string|null}};
export function MeetingRecord({meetingId,manager,request}:{meetingId:string;manager:boolean;request:Request}){
 const [open,setOpen]=useState(false);
 return <><button className="secondary" onClick={()=>setOpen(true)}><FileText size={17}/> Agenda & summary</button>{open&&<RecordDialog meetingId={meetingId} manager={manager} request={request} close={()=>setOpen(false)}/>}</>;
}
function RecordDialog({meetingId,manager,request,close}:{meetingId:string;manager:boolean;request:Request;close:()=>void}){
 const [data,setData]=useState<MeetingDocument|null>(null),[draft,setDraft]=useState({summary:'',decisions:'',actions:''}),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const path='/meetings/'+meetingId+'/record';
 function apply(d:MeetingDocument){setData(d);setDraft({summary:d.notes.summary,decisions:d.notes.decisions,actions:d.notes.actions});setEditing(false)}
 useEffect(()=>{let active=true;request(path).then(d=>{if(active)apply(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[meetingId]);
 async function reload(){setError('');setBusy(true);try{apply(await request(path))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function exportPdf(){setError('');setBusy(true);try{
  // Fetch the saved record again so the export never contains unsaved edits or stale permissions.
  const current:MeetingDocument=await request(path);setData(current);
  const frame=document.createElement('iframe');frame.title='Meeting PDF print document';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0';
  frame.onload=async()=>{const win=frame.contentWindow;if(!win){setError('Unable to open printing. Try another browser.');frame.remove();return}await win.document.fonts.ready;win.addEventListener('afterprint',()=>frame.remove(),{once:true});try{win.focus();win.print()}catch{setError('Printing was blocked. Please allow printing and try again.');frame.remove()}setTimeout(()=>frame.remove(),300000)};
  frame.srcdoc=meetingPrintHtml(current);document.body.append(frame);
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <Modal title="Meeting agenda & summary" close={close}><div className="meeting-record">
 {error&&<div className="error" role="alert">{error}<button disabled={busy} onClick={()=>void reload()}>Reload saved record</button></div>}
 {!data?<p role="status">Loading meeting record…</p>:<><h2>{data.meeting.title}</h2><p>{new Date(data.meeting.start).toLocaleString('en-GB',{timeZone:'Asia/Colombo'})} (Sri Lanka)</p><p>{data.meeting.location} · {data.meeting.cancelled?'Cancelled':'Scheduled'}</p><h3>Participants</h3><p>{data.attendees.map(a=>a.name+' ('+a.response+')').join(', ')}</p><h3>Agenda</h3><p className="preserve-lines">{data.meeting.agenda||'No agenda recorded. Use Edit meeting to add one.'}</p>
 {editing?<form onSubmit={async e=>{e.preventDefault();setError('');setSaved('');setBusy(true);try{apply(await request(path,'PUT',{...draft,version:data.notes.version}));setSaved('Meeting summary saved. Participants can now view it.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
 <label>Meeting summary<textarea rows={6} maxLength={12000} value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/><small>Discussion and outcomes (maximum 12,000 characters).</small></label>
 <label>Decisions<textarea rows={4} maxLength={8000} value={draft.decisions} onChange={e=>setDraft({...draft,decisions:e.target.value})}/></label>
 <label>Action items, owners and due dates<textarea rows={4} maxLength={8000} placeholder="Action — responsible person — due date" value={draft.actions} onChange={e=>setDraft({...draft,actions:e.target.value})}/></label>
 <div className="meeting-record-actions"><button className="primary" disabled={busy}>Save summary</button><button type="button" className="secondary" disabled={busy} onClick={()=>{apply(data);setError('')}}>Cancel editing</button></div></form>:<>
 <h3>Meeting summary</h3><p className="preserve-lines">{data.notes.summary||'Summary not recorded yet.'}</p><h3>Decisions</h3><p className="preserve-lines">{data.notes.decisions||'No decisions recorded.'}</p><h3>Action items, owners and due dates</h3><p className="preserve-lines">{data.notes.actions||'No action items recorded.'}</p>
 <p className="muted">{data.notes.updatedAt?'Saved by '+data.notes.updatedBy+' on '+new Date(data.notes.updatedAt).toLocaleString('en-GB',{timeZone:'Asia/Colombo'})+' (Sri Lanka) · Revision '+data.notes.version:'No saved summary yet.'}</p><div className="meeting-record-actions">{manager&&<button className="primary" onClick={()=>{setEditing(true);setSaved('')}}>Edit summary</button>}<button className="secondary" disabled={busy} onClick={()=>void exportPdf()}><Printer size={17}/> Print / Save PDF</button></div><p className="muted">Choose “Save as PDF” as the printer or destination to download the saved agenda and summary.</p></>}
 {saved&&<p role="status" className="office-notice">{saved}</p>}</>}
 </div></Modal>;
}

