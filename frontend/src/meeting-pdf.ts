import {jsPDF} from 'jspdf';
import type {MeetingDocument} from './components/MeetingRecord';
import {summaryColumns,summaryRows} from './meeting-summary';

// Draw text with the browser's font shaping so Sinhala/Tamil and other Unicode
// characters use the same installed fallback fonts as the meeting interface.
// Each PDF page is rendered at twice A4 point resolution; lines are never sliced.
export async function downloadMeetingPdf(record:MeetingDocument){
 await document.fonts.ready;
 const pdf=new jsPDF({unit:'pt',format:'a4',compress:true});
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF creation is unavailable in this browser.');
 const width=canvas.width,height=canvas.height,margin=100,bottom=height-120,lineHeight=32;
 let y=margin,page=1;
 const font=(size=22,bold=false)=>{ctx.font=`${bold?'bold ':''}${size}px Arial, sans-serif`;ctx.fillStyle='#19394d';ctx.textBaseline='top'};
 function clear(){ctx!.fillStyle='#fff';ctx!.fillRect(0,0,width,height);font();y=margin}
 function finish(){font(17);ctx!.fillStyle='#526471';ctx!.fillText('SLSI IT Division | Meeting record',margin,height-70);ctx!.textAlign='right';ctx!.fillText('Page '+page,width-margin,height-70);ctx!.textAlign='left';pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,pdf.internal.pageSize.getWidth(),pdf.internal.pageSize.getHeight())}
 function space(amount:number){if(y+amount>bottom){finish();pdf.addPage();page++;clear()}}
 function wrap(value:string,maxWidth=width-2*margin){
  const lines:string[]=[];
  for(const paragraph of value.split(/\r?\n/)){
   let line='';
   for(const word of paragraph.split(/\s+/)){
    const candidate=line?line+' '+word:word;
    if(ctx!.measureText(candidate).width<=maxWidth){line=candidate;continue}
    if(line){lines.push(line);line=''}
    // Split very long tokens on Unicode grapheme boundaries, not UTF-16 units.
    for(const {segment} of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word)){
     if(line&&ctx!.measureText(line+segment).width>maxWidth){lines.push(line);line=''}
     line+=segment;
    }
   }
   lines.push(line);
  }
  return lines;
 }
 function text(value:string,size=22,bold=false){font(size,bold);const leading=Math.ceil(size*1.5);const lines=wrap(value);for(const line of lines){space(leading);font(size,bold);ctx!.fillText(line,margin,y);y+=leading}y+=10}
 function section(title:string,body:string){space(3*lineHeight);y+=12;text(title,26,true);text(body)}
 function summaryTable(){
  const rows=summaryRows(record.notes);
  if(!rows.length){section('Meeting summary','Summary not recorded yet.');return}
  const columnWidth=(width-2*margin)/summaryColumns.length,padding=10,leading=27;
  function cells(values:string[][],lineCount:number,heading=false){
   const rowHeight=lineCount*leading+2*padding;
   values.forEach((lines,index)=>{
    const x=margin+index*columnWidth;
    ctx!.fillStyle=heading?'#f0f5f6':'#fff';
    ctx!.fillRect(x,y,columnWidth,rowHeight);
    ctx!.strokeStyle='#cad8dc';
    ctx!.strokeRect(x,y,columnWidth,rowHeight);
    font(19,heading);
    lines.forEach((line,i)=>ctx!.fillText(line,x+padding,y+padding+i*leading));
   });
   y+=rowHeight;
  }
  const header=()=>cells(summaryColumns.map(({label})=>[label]),1,true);
  space(5*lineHeight);
  text('Meeting summary',26,true);
  header();
  for(const row of rows){
   font(19);
   const values=summaryColumns.map(({key})=>wrap(row[key]||'—',columnWidth-2*padding));
   const lineCount=Math.max(...values.map(lines=>lines.length));
   for(let offset=0;offset<lineCount;){
    if(y+leading+2*padding>bottom){space(leading+2*padding);header()}
    const count=Math.min(lineCount-offset,Math.floor((bottom-y-2*padding)/leading));
    cells(values.map(lines=>lines.slice(offset,offset+count)),count);
    offset+=count;
   }
  }
 }
 const m=record.meeting,n=record.notes;
 const when=(s:string)=>new Date(s).toLocaleString('en-GB',{timeZone:'Asia/Colombo'});
 clear();text('SRI LANKA STANDARDS INSTITUTION',20,true);text('IT Division | Meeting discussion and summary',20);text(m.title,38,true);
 text('Date and time: '+when(m.start)+' (Asia/Colombo)');text('Location: '+(m.location||'Not specified'));text('Status: '+(m.cancelled?'Cancelled':'Scheduled'));
 section('Participants and invitation responses',record.attendees.map(a=>a.name+' — '+a.response).join('\n')||'No participants');
 section('Discussion topic',m.agenda||'No discussion topic recorded.');
 summaryTable();
 section('Record details',n.updatedAt?'Summary revision '+n.version+'\nSaved by '+(n.updatedBy||'Former member')+'\n'+when(n.updatedAt)+' (Asia/Colombo)':'No saved summary yet.');
 text('Invitation responses do not confirm actual attendance.',18);finish();
 pdf.setProperties({title:m.title+' - Meeting record',author:'SLSI IT Division',subject:'Saved meeting discussion and summary'});
 const name=m.title.replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'meeting';
 pdf.save(name+'-summary.pdf');
}
