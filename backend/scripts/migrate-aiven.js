import '../src/database/config.js';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {mysqlConfig} from '../src/database/config.js';
import {createMySQLStore} from '../src/database/mysql-store.js';

// Local MYSQL_* settings remain the source. Separate AIVEN_* settings are the destination.
process.loadEnvFile(fileURLToPath(new URL('../.env.aiven',import.meta.url)));
for(const key of ['AIVEN_HOST','AIVEN_PORT','AIVEN_DATABASE','AIVEN_USER','AIVEN_PASSWORD','AIVEN_CA_FILE']){
 if(!process.env[key])throw new Error(`Missing ${key} in backend/.env.aiven`);
}
const sourceConfig=mysqlConfig();
const targetConfig={...sourceConfig,host:process.env.AIVEN_HOST,port:Number(process.env.AIVEN_PORT),
 database:process.env.AIVEN_DATABASE,user:process.env.AIVEN_USER,password:process.env.AIVEN_PASSWORD,
 ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.AIVEN_CA_FILE,'utf8')}};
if(sourceConfig.host===targetConfig.host&&sourceConfig.port===targetConfig.port&&sourceConfig.database===targetConfig.database){
 throw new Error('Source and destination must be different databases.');
}
let source,target;
try{
 source=await createMySQLStore(sourceConfig);
 if(!source.db.users.length)throw new Error('Local source has no users; nothing copied.');
 target=await createMySQLStore(targetConfig,{initialize:true});
 if(Object.values(target.db).some(value=>Array.isArray(value)&&value.length)){
  throw new Error('Destination already contains application data. Refusing to overwrite it.');
 }
 const data=structuredClone(source.db);
 // Require fresh logins and device subscriptions on the new website.
 data.sessions=[];data.pushSubscriptions=[];data.pushOutbox=[];
 Object.assign(target.db,data);
 await target.save();
 await target.refresh();
 if(!isDeepStrictEqual(data,target.db))throw new Error('Copy committed but verification differs. Inspect destination before retrying.');
 console.log(`Verified cloud copy: ${data.users.length} users, ${data.tasks.length} tasks, ${data.messages.length} messages. Local database unchanged.`);
}finally{await target?.close();await source?.close()}
