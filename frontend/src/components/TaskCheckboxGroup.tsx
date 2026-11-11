import {useEffect,useRef,useState} from 'react';

type Option={value:string;label:string};

export function TaskCheckboxGroup({legend,name,options}:{legend:string;name:string;options:Option[]}){
 const [selected,setSelected]=useState<Set<string>>(()=>new Set());
 const selectAll=useRef<HTMLInputElement>(null);
 const count=options.filter(option=>selected.has(option.value)).length;
 const all=options.length>0&&count===options.length;

 useEffect(()=>{
  if(selectAll.current)selectAll.current.indeterminate=count>0&&!all;
 },[count,all]);

 function toggle(value:string,checked:boolean){
  setSelected(previous=>{
   const next=new Set(previous);
   if(checked)next.add(value);
   else next.delete(value);
   return next;
  });
 }

 return <fieldset className="task-checkbox-group">
  <legend>{legend}</legend>
  <label className="task-checkbox-all">
   <input ref={selectAll} type="checkbox" checked={all} disabled={!options.length}
    onChange={e=>setSelected(e.target.checked?new Set(options.map(option=>option.value)):new Set())}/>
   <span>Select all</span>
  </label>
  {options.map(({value,label})=><label className="task-checkbox-option" key={value}>
   <input type="checkbox" name={name} value={value} checked={selected.has(value)}
    onChange={e=>toggle(value,e.target.checked)}/>
   <span>{label}</span>
  </label>)}
 </fieldset>;
}
