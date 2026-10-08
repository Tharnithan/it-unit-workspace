import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const envPath=fileURLToPath(new URL('../../.env',import.meta.url));
if(existsSync(envPath))process.loadEnvFile(envPath);

export function mysqlConfig(overrides={}){
 return {host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT)||3306,
  user:process.env.MYSQL_USER||'it_unit_app',password:process.env.MYSQL_PASSWORD||'',
  database:process.env.MYSQL_DATABASE||'it_unit_workspace',charset:'utf8mb4',
  timezone:'Z',dateStrings:true,connectTimeout:10000,...overrides};
}
