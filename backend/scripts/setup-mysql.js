import '../src/database/config.js';
import mysql from 'mysql2/promise';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mysqlConfig} from '../src/database/config.js';
import {createMySQLStore} from '../src/database/mysql-store.js';
import {schema} from '../src/database/model.js';
import {seed} from '../src/store.js';

const database=process.env.MYSQL_DATABASE||'it_unit_workspace';
if(!/^[a-zA-Z0-9_]+$/.test(database))throw new Error('Invalid MYSQL_DATABASE identifier');
const adminConfig=mysqlConfig({user:process.env.MYSQL_ADMIN_USER||'root',password:process.env.MYSQL_ADMIN_PASSWORD||'',database:undefined});
const admin=await mysql.createConnection(adminConfig);
let store;
try{
 await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 store=await createMySQLStore({...adminConfig,database},{initialize:true});
 if(!store.db.users.length){
  const source=fileURLToPath(new URL('../data/workspace.sqlite',import.meta.url));
  let data;
  if(existsSync(source)){
   const sqlite=new DatabaseSync(source,{readOnly:true});
   try{
    sqlite.exec('BEGIN');
    data={};
    for(const name of ['users','tasks','meetings','conversations','messages','notifications','audit','sessions','pushSubscriptions','pushOutbox']){
     const exists=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
     data[name]=exists?sqlite.prepare(`SELECT data FROM "${name}" ORDER BY rowid`).all().map(r=>JSON.parse(r.data)):[];
    }
    sqlite.exec('COMMIT');
   }finally{sqlite.close()}
   const backup=fileURLToPath(new URL(`../data/pre-mysql-${Date.now()}.json`,import.meta.url));
   writeFileSync(backup,JSON.stringify(data,null,2),{mode:0o600,flag:'wx'});
   console.log('Created a local migration backup. The SQLite database is unchanged.');
  }else{
   if(!process.env.INITIAL_PASSWORD)throw new Error('No SQLite data found. Set INITIAL_PASSWORD before initializing a fresh database.');
   data=seed();console.log('Initialized a new workspace from seed data.');
  }
  Object.assign(store.db,data);
  await store.save();
  console.log(`Migrated ${store.db.users.length} accounts, ${store.db.tasks.length} tasks, ${store.db.messages.length} messages and ${store.db.meetings.length} meetings.`);
 }else console.log('Existing MySQL records retained; migration was not repeated.');
 const envFile=fileURLToPath(new URL('../.env',import.meta.url));
 let appUser=process.env.MYSQL_USER;
 let appPassword=process.env.MYSQL_PASSWORD;
 if(!appUser){
  appUser='it_unit_app';appPassword=randomBytes(32).toString('hex');
  const [existing]=await admin.execute('SELECT User FROM mysql.user WHERE User=? AND Host=?',[appUser,'localhost']);
  if(existing.length)throw new Error('The it_unit_app database login already exists. Configure MYSQL_USER and MYSQL_PASSWORD in backend/.env rather than replacing it.');
  await admin.query('CREATE USER ?@? IDENTIFIED BY ?',[appUser,'localhost',appPassword]);
  if(!/^[a-zA-Z0-9_]+$/.test(appUser))throw new Error('Invalid application user name');
  await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${database}\`.* TO ?@?`,[appUser,'localhost']);
  const prior=existsSync(envFile)?readFileSync(envFile,'utf8'):'';
  writeFileSync(envFile,prior+`\n# Local XAMPP database credentials. Keep this file private.\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=3306\nMYSQL_DATABASE=${database}\nMYSQL_USER=${appUser}\nMYSQL_PASSWORD=${appPassword}\n`,{mode:0o600});
  console.log('Saved a dedicated application login in backend/.env (password not printed).');
 }
 const verification=await createMySQLStore(mysqlConfig({database,user:appUser,password:appPassword}));
 console.log(`Verified application database access: ${database}.`);
 await verification.close();
 const sqlDir=fileURLToPath(new URL('../sql/',import.meta.url));mkdirSync(sqlDir,{recursive:true});
 writeFileSync(sqlDir+'schema.sql',schema+'\n');
}finally{await store?.close();await admin.end()}
