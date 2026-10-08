import './database/config.js';
import {createMySQLStore} from './database/mysql-store.js';
import {createApp} from './app.js';

try{
 const store=await createMySQLStore();
 if(!store.db.users.length){await store.close();throw new Error('The database is empty. Run npm run db:setup --workspace backend first.')}
 const app=createApp(store);
 const port=Number(process.env.PORT)||4000;
 const server=app.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`IT unit API: http://${process.env.HOST||'0.0.0.0'}:${port} | MySQL: ${process.env.MYSQL_DATABASE||'it_unit_workspace'}`));
 const timer=setInterval(()=>void app.locals.push.flush().catch(e=>console.error('Push delivery:',e.message)),15000);timer.unref();
 let stopping=false;
 async function stop(){if(stopping)return;stopping=true;clearInterval(timer);server.close(async()=>{await store.close();process.exit(0)})}
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(error){console.error('Backend startup failed:',error.message);console.error('Start MySQL in XAMPP and check backend/.env.');process.exitCode=1}
