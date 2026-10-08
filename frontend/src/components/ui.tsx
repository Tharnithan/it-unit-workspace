import type {ReactNode} from 'react';
import {X} from 'lucide-react';
import type {User} from '../types';
export const initials=(name:string)=>name.replace(/^(Mr\.|Ms\.|Mrs\.)\s*/,'').split(' ').map(x=>x[0]).slice(0,2).join('');
export const date=(x:string)=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Colombo'});
export const time=(x:string)=>new Date(x).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Colombo'});
export function Avatar({user,small=false}:{user?:User;small?:boolean}){return <span className={'avatar '+(small?'small ':'')+'color'+((Number(user?.id.replace('u',''))||0)%5)}>{initials(user?.name||'?')}</span>}
export function Modal({title,children,close}:{title:string;children:ReactNode;close:()=>void}){return <div className="overlay" onClick={close}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" aria-label="Close" onClick={close}><X size={20}/></button></header>{children}</section></div>}
