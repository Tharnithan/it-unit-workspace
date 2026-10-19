import mysql from 'mysql2/promise';
import {mysqlConfig} from '../src/database/config.js';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
let config=mysqlConfig();
if(process.argv.includes('--aiven')){
 process.loadEnvFile(fileURLToPath(new URL('../.env.aiven',import.meta.url)));
 for(const name of ['HOST','PORT','DATABASE','USER','PASSWORD','CA_FILE'])if(!process.env['AIVEN_'+name])throw new Error('Missing AIVEN_'+name);
 config={...config,host:process.env.AIVEN_HOST,port:Number(process.env.AIVEN_PORT),database:process.env.AIVEN_DATABASE,user:process.env.AIVEN_USER,password:process.env.AIVEN_PASSWORD,ssl:{rejectUnauthorized:true,ca:readFileSync(process.env.AIVEN_CA_FILE,'utf8')}};
}
const connection=await mysql.createConnection(config);
try{
 const [columns]=await connection.query("SHOW COLUMNS FROM users LIKE 'email_verification'");
 if(!columns.length)await connection.query('ALTER TABLE users ADD COLUMN email_verification TEXT NULL');
 console.log('Email verification schema ready; existing records retained.');
}finally{await connection.end()}
