import {useEffect,useRef,useState} from 'react';
import type {Task,User} from '../types';
type Result={tasks:Task[];total:number;offset:number;limit:number};
type Props={request:(path:string)=>Promise<Result>;users:User[];openTask:(task:Task)=>void;revision:Task[]};
const completedDate=(value:string)=>new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Colombo',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function EndedTasks({request,users,openTask,revision}:Props){
 const [search,setSearch]=useState(''),[month,setMonth]=useState(''),[offset,setOffset]=useState(0);
 const [result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const requestRef=useRef(request);requestRef.current=request;
 // Re-fetch after the workspace poll observes a completion, reopening or deletion.
 const signature=JSON.stringify(revision.filter(t=>t.status==='Completed').map(t=>[t.id,t.completedAt,t.resolution,t.assignee]));
 useEffect(()=>{
  let active=true;setLoading(true);setError('');
  const timer=setTimeout(async()=>{try{
   const data=await requestRef.current('/tasks/ended?'+new URLSearchParams({search,month,offset:String(offset),limit:'20'}));
   if(active){if(offset>0&&offset>=data.total)setOffset(Math.max(0,Math.floor((data.total-1)/20)*20));else setResult(data)}
  }catch(e){if(active){setError((e as Error).message);setResult(null)}}finally{if(active)setLoading(false)}},250);
  return()=>{active=false;clearTimeout(timer)};
 },[search,month,offset,signature]);
 return <section className="card ended-tasks"><div className="list-toolbar"><label>Search ended tasks<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setOffset(0)}} placeholder="Task, employee, division or resolution"/></label><label>Completion month<input type="month" value={month} onChange={e=>{setMonth(e.target.value);setOffset(0)}}/></label><button className="secondary" onClick={()=>{setSearch('');setMonth('');setOffset(0)}}>Clear filters</button></div>
 <p className="ended-summary" role="status">{loading?'Loading ended tasks…':`${result?.total??0} completed tasks · newest first · Sri Lanka time`}</p>
 {error&&<p className="error" role="alert">{error}</p>}
 {!loading&&result&&<><div className="table-scroll"><table className="task-table"><thead><tr><th>Task / division</th><th>Assigned to</th><th>Completed</th><th>Resolution</th><th>Details</th></tr></thead><tbody>{result.tasks.map(task=><tr key={task.id}><td><strong>{task.title}</strong><span>{task.division}</span></td><td>{task.completionSnapshot?.name||users.find(u=>u.id===task.assignee)?.name||'Former team member'}</td><td>{task.completedAt?completedDate(task.completedAt):'—'}</td><td className="ended-resolution">{task.resolution}</td><td><button className="secondary" onClick={()=>openTask(task)} aria-label={'View '+task.title}>View</button></td></tr>)}</tbody></table></div>
 {!result.tasks.length&&<div className="empty">No ended tasks match these filters.</div>}
 <div className="ended-pagination"><button className="secondary" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous</button><span>Page {Math.floor(offset/20)+1} of {Math.max(1,Math.ceil(result.total/20))}</span><button className="secondary" disabled={offset+20>=result.total} onClick={()=>setOffset(offset+20)}>Next</button></div></>}
 </section>;
}
