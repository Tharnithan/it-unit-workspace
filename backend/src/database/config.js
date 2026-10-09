import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const envPath=fileURLToPath(new URL('../../.env',import.meta.url));
if(existsSync(envPath))process.loadEnvFile(envPath);

export function mysqlConfig(overrides={}){
 const ca=process.env.MYSQL_SSL_CA || (process.env.MYSQL_SSL_CA_FILE?readFileSync(process.env.MYSQL_SSL_CA_FILE,'utf8'):undefined);
 const ssl=ca || process.env.MYSQL_SSL==='true' ? {rejectUnauthorized:true,...(ca?{ca}: {})}:undefined;
 return {host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT)||3306,
  user:process.env.MYSQL_USER||'it_unit_app',password:process.env.MYSQL_PASSWORD||'',
  database:process.env.MYSQL_DATABASE||'it_unit_workspace',charset:'utf8mb4',
  timezone:'Z',dateStrings:true,connectTimeout:10000,...(ssl?{ssl}:{}),...overrides};
}
