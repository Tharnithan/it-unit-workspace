import '../src/database/config.js';
import {createMySQLStore} from '../src/database/mysql-store.js';
import {createApp} from '../src/app.js';
import {maintain} from '../src/maintenance.js';
const store=await createMySQLStore();
try{const app=createApp(store);await maintain(store,app.locals.context);await app.locals.push.flush();console.log('Workspace maintenance completed.')}finally{await store.close()}
