import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X,MessagesSquare,Bell} from 'lucide-react';

export function WorkspacePopup({kind,children,onClose,suspended=false}:{kind:'Messages'|'Notifications';children:ReactNode;onClose:()=>void;suspended?:boolean}){
 const panel=useRef<HTMLElement>(null);
 const closeRef=useRef(onClose);closeRef.current=onClose;
 const [closing,setClosing]=useState(false);
 const opener=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  opener.current=document.activeElement as HTMLElement;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  const background=Array.from(document.querySelectorAll<HTMLElement>('.app > .sidebar,.app > .main'));
  const prior=background.map(el=>el.inert);background.forEach(el=>el.inert=true);
  return()=>{document.body.style.overflow=previous;background.forEach((el,i)=>el.inert=prior[i]);opener.current?.focus();};
 },[]);
 useEffect(()=>{if(!closing)return;const timer=setTimeout(()=>closeRef.current(),160);return()=>clearTimeout(timer);},[closing]);
 useEffect(()=>{
  if(suspended)return;
  const root=panel.current;if(!root)return;
  const focusable=()=>Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length);
  focusable()[0]?.focus();
  const handler=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setClosing(true);}
   if(event.key==='Tab'){const items=focusable();const first=items[0],last=items[items.length-1];if(!first){event.preventDefault();root.focus();return;}if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus();}}
  };
  document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);
 },[suspended]);
 const Icon=kind==='Messages'?MessagesSquare:Bell;
 return createPortal(<div className={'workspace-popup-backdrop '+(closing?'is-closing':'')} onClick={e=>{if(e.target===e.currentTarget&&!suspended)setClosing(true);}}><section ref={panel} className={'workspace-popup '+(kind==='Messages'?'chat-popup':'notifications-popup')} role="dialog" aria-modal={!suspended} aria-labelledby="workspace-popup-title" tabIndex={-1} inert={suspended}><header className="workspace-popup-heading"><div><Icon size={24}/><h2 id="workspace-popup-title">{kind==='Messages'?'Team chat':'Notifications'}</h2></div><button className="icon-button" aria-label={'Close '+kind.toLowerCase()} onClick={()=>setClosing(true)}><X size={22}/></button></header><div className="workspace-popup-body">{children}</div></section></div>,document.body);
}
