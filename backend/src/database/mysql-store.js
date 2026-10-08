import mysql from 'mysql2/promise';
import {mysqlConfig} from './config.js';
import {schema,tables} from './model.js';
import {toRecords,fromRecords} from './records.js';

const key=(table,row)=>JSON.stringify(table.keys.map(k=>row[k]));
export async function createMySQLStore(config=mysqlConfig(),{initialize=false}={}){
 const connection=await mysql.createConnection(config);
 try{if(initialize)for(const statement of schema.split(';').filter(s=>s.trim()))await connection.query(statement)}catch(e){await connection.end();throw e}
 const db={};let baseline={};let revision=0;let pending=Promise.resolve();
 async function refresh(){
  await connection.beginTransaction();
  try{
   const [meta]=await connection.query('SELECT revision FROM workspace_meta WHERE id=1');
   if(!meta.length)throw new Error('Database schema missing. Run npm run db:setup --workspace backend.');
   const rows={};
   for(const table of tables){const [records]=await connection.query(`SELECT * FROM \`${table.name}\` ORDER BY position`);rows[table.name]=records}
   await connection.commit();
   const loaded=fromRecords(rows);Object.assign(db,loaded);baseline=toRecords(loaded);revision=Number(meta[0].revision);
  }catch(e){await connection.rollback();throw e}
 }
 async function acquire(){
  const previous=pending;let release;pending=new Promise(resolve=>{release=resolve});
  await previous;
  try{await refresh();return release}catch(e){release();throw e}
 }
 async function save(){
  const next=toRecords(db);
  await connection.beginTransaction();
  try{
   const [meta]=await connection.query('SELECT revision FROM workspace_meta WHERE id=1 FOR UPDATE');
   if(Number(meta[0].revision)!==revision)throw new Error('Another process changed the database. Please retry.');
   // Remove only records deleted by this operation, respecting foreign keys.
   for(const table of [...tables].reverse()){
    const retained=new Set(next[table.name].map(row=>key(table,row)));
    for(const row of baseline[table.name])if(!retained.has(key(table,row)))await connection.execute(`DELETE FROM \`${table.name}\` WHERE ${table.keys.map(c=>'`'+c+'` = ?').join(' AND ')}`,table.keys.map(c=>row[c]));
   }
   for(const table of tables){
    const old=new Map(baseline[table.name].map(row=>[key(table,row),JSON.stringify(row)]));
    const columns=table.columns.map(([column])=>column);
    for(const row of next[table.name]){
     if(old.get(key(table,row))===JSON.stringify(row))continue;
     if(old.has(key(table,row))){
      const fields=columns.filter(c=>!table.keys.includes(c));
      await connection.execute(`UPDATE \`${table.name}\` SET ${fields.map(c=>'`'+c+'`=?').join(',')} WHERE ${table.keys.map(c=>'`'+c+'`=?').join(' AND ')}`,[...fields.map(c=>row[c]),...table.keys.map(c=>row[c])]);
     }else{
      // A collision on another unique key must fail, never overwrite a different record.
      await connection.execute(`INSERT INTO \`${table.name}\` (${columns.map(c=>'`'+c+'`').join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,columns.map(c=>row[c]));
     }
    }
   }
   await connection.query('UPDATE workspace_meta SET revision=revision+1 WHERE id=1');
   await connection.commit();revision++;baseline=next;
  }catch(e){await connection.rollback();Object.assign(db,fromRecords(baseline));throw e}
 }
 try{await refresh()}catch(e){await connection.end();throw e}
 return {db,save,acquire,refresh,close:()=>connection.end(),kind:'mysql'};
}
