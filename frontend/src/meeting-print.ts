import type {MeetingDocument} from './components/MeetingRecord';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function meetingPrintHtml(d:MeetingDocument){
 const m=d.meeting,n=d.notes;
 const when=(s:string)=>new Date(s).toLocaleString('en-GB',{timeZone:'Asia/Colombo'});
 const section=(title:string,body:string)=>'<section><h2>'+escape(title)+'</h2><p>'+escape(body)+'</p></section>';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(m.title)} - Meeting record</title><style>
 @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.55;color:#19394d;margin:0}header{border-bottom:3px solid #198c83;padding-bottom:12px;margin-bottom:20px}.brand{font-size:10pt;letter-spacing:1px;text-transform:uppercase;color:#37716c}h1{font-size:23pt;line-height:1.25;margin:10px 0;overflow-wrap:anywhere}h2{font-size:13pt;margin:22px 0 8px;break-after:avoid}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 10px;orphans:3;widows:3}.meta{background:#f0f5f6;padding:12px}.foot{border-top:1px solid #cad8dc;padding-top:12px;margin-top:25px;font-size:9pt;color:#526471}section{break-inside:auto}strong{font-weight:700}</style></head><body>
 <header><div class="brand">Sri Lanka Standards Institution · IT Division</div><h1>${escape(m.title)}</h1><p>Meeting agenda and summary</p></header><div class="meta"><p><strong>Date and time:</strong> ${escape(when(m.start))} (Asia/Colombo)</p><p><strong>Location:</strong> ${escape(m.location||'Not specified')}</p><p><strong>Status:</strong> ${m.cancelled?'Cancelled':'Scheduled'}</p></div>
 ${section('Participants and invitation responses',d.attendees.map(a=>a.name+' — '+a.response).join('\n')||'No participants')}
 ${section('Agenda',m.agenda||'No agenda recorded.')}${section('Meeting summary',n.summary||'Summary not recorded yet.')}${section('Decisions',n.decisions||'No decisions recorded.')}${section('Action items, owners and due dates',n.actions||'No action items recorded.')}
 <div class="foot"><p>${escape(n.updatedAt?'Summary revision '+n.version+' · Saved by '+n.updatedBy+' · '+when(n.updatedAt)+' (Asia/Colombo)':'No saved summary yet.')}</p><p>Invitation responses do not confirm actual attendance.</p></div></body></html>`;
}
