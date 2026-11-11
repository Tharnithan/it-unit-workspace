import {useEffect,useState} from 'react';
import {FileText,Printer,Download} from 'lucide-react';
import {Modal} from './ui';
import type {Meeting} from '../types';
import type {Request} from '../office-types';
import {meetingPrintHtml} from '../meeting-print';
import {emptySummaryRow,summaryColumns,summaryRows,type SummaryRow} from '../meeting-summary';

export type MeetingDocument={meeting:Meeting;attendees:{id:string;name:string;response:string}[];notes:{rows?:SummaryRow[];summary:string;decisions:string;actions:string;version:number;updatedAt:string|null;updatedBy:string|null}};
export function MeetingRecord({meetingId,manager,request}:{meetingId:string;manager:boolean;request:Request}){
 const [open,setOpen]=useState(false);
 return <><button className="secondary" onClick={()=>setOpen(true)}><FileText size={17}/> Discussion & summary</button>{open&&<RecordDialog meetingId={meetingId} manager={manager} request={request} close={()=>setOpen(false)}/>}</>;
}
function RecordDialog({meetingId,manager,request,close}:{meetingId:string;manager:boolean;request:Request;close:()=>void}){
 const [data,setData]=useState<MeetingDocument|null>(null),[draft,setDraft]=useState<SummaryRow[]>([]),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const path='/meetings/'+meetingId+'/record';
 function apply(d:MeetingDocument){setData(d);setDraft(summaryRows(d.notes));setEditing(false)}
 useEffect(()=>{let active=true;request(path).then(d=>{if(active)apply(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[meetingId]);
 function updateRow(index:number,key:keyof SummaryRow,value:string){
  setDraft(rows=>rows.map((row,i)=>i===index?{...row,[key]:value}:row));
 }
 async function reload(){setError('');setBusy(true);try{apply(await request(path))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function printRecord(){setError('');setBusy(true);try{
  // Fetch the saved record again so the export never contains unsaved edits or stale permissions.
  const current:MeetingDocument=await request(path);setData(current);
  const frame=document.createElement('iframe');frame.title='Meeting PDF print document';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0';
  frame.onload=async()=>{const win=frame.contentWindow;if(!win){setError('Unable to open printing. Try another browser.');frame.remove();return}await win.document.fonts.ready;win.addEventListener('afterprint',()=>frame.remove(),{once:true});try{win.focus();win.print()}catch{setError('Printing was blocked. Please allow printing and try again.');frame.remove()}setTimeout(()=>frame.remove(),300000)};
  frame.srcdoc=meetingPrintHtml(current);document.body.append(frame);
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function downloadPdf(){setError('');setBusy(true);try{
  const current:MeetingDocument=await request(path);setData(current);
  const {downloadMeetingPdf}=await import('../meeting-pdf');await downloadMeetingPdf(current);
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <Modal title="Meeting discussion & summary" close={close}><div className="meeting-record">
 {error&&<div className="error" role="alert">{error}<button disabled={busy} onClick={()=>void reload()}>Reload saved record</button></div>}
 {!data?<p role="status">Loading meeting record…</p>:<><h2>{data.meeting.title}</h2><p>{new Date(data.meeting.start).toLocaleString('en-GB',{timeZone:'Asia/Colombo'})} (Sri Lanka)</p><p>{data.meeting.location} · {data.meeting.cancelled?'Cancelled':'Scheduled'}</p><h3>Participants</h3><p>{data.attendees.map(a=>a.name+' ('+a.response+')').join(', ')}</p><h3>Discussion topic</h3><p className="preserve-lines">{data.meeting.agenda||'No discussion topic recorded.'}</p>
 {editing?<form onSubmit={async e=>{e.preventDefault();setError('');setSaved('');setBusy(true);try{apply(await request(path,'PUT',{rows:draft,version:data.notes.version}));setSaved('Meeting summary saved. Participants can now view it.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
 <h3>Meeting summary</h3>
 <div className="table-scroll"><table className="task-table meeting-summary-table"><thead><tr>{summaryColumns.map(column=><th key={column.key} scope="col">{column.label}</th>)}<th scope="col">Actions</th></tr></thead>
 <tbody>{draft.map((row,index)=><tr key={index}>{summaryColumns.map(({key,label,maxLength})=><td key={key}>{key==='dueDate'
  ?<input type="date" aria-label={label+' for row '+(index+1)} value={row[key]} onChange={e=>updateRow(index,key,e.target.value)}/>
  :<textarea rows={3} maxLength={maxLength} aria-label={label+' for row '+(index+1)} value={row[key]} onChange={e=>updateRow(index,key,e.target.value)}/>}</td>)}
 <td><button type="button" className="text-button danger" onClick={()=>setDraft(draft.filter((_,i)=>i!==index))}>Remove row</button></td></tr>)}</tbody></table></div>
 <button type="button" className="secondary" disabled={draft.length>=50} onClick={()=>setDraft([...draft,emptySummaryRow()])}>Add row</button>
 <div className="meeting-record-actions"><button className="primary" disabled={busy}>Save summary</button><button type="button" className="secondary" disabled={busy} onClick={()=>{apply(data);setError('')}}>Cancel editing</button></div></form>:<>
 <h3>Meeting summary</h3>
 {summaryRows(data.notes).length?<div className="table-scroll"><table className="task-table meeting-summary-table"><thead><tr>{summaryColumns.map(column=><th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
 <tbody>{summaryRows(data.notes).map((row,index)=><tr key={index}>{summaryColumns.map(({key})=><td className="preserve-lines" key={key}>{row[key]||'—'}</td>)}</tr>)}</tbody></table></div>:<p>Summary not recorded yet.</p>}
 <p className="muted">{data.notes.updatedAt?'Saved by '+data.notes.updatedBy+' on '+new Date(data.notes.updatedAt).toLocaleString('en-GB',{timeZone:'Asia/Colombo'})+' (Sri Lanka) · Revision '+data.notes.version:'No saved summary yet.'}</p><div className="meeting-record-actions">{manager&&<button className="primary" onClick={()=>{if(!draft.length)setDraft([emptySummaryRow()]);setEditing(true);setSaved('')}}>Edit summary</button>}<button className="secondary" disabled={busy} onClick={()=>void downloadPdf()}><Download size={17}/> Download PDF</button><button className="secondary" disabled={busy} onClick={()=>void printRecord()}><Printer size={17}/> Print</button></div><p className="muted">Download PDF saves the latest saved record as a file. Print opens your printer options.</p></>}
 {saved&&<p role="status" className="office-notice">{saved}</p>}</>}
 </div></Modal>;
}

