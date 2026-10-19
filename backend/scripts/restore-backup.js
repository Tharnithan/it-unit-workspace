import '../src/database/config.js';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {decryptBackup} from '../src/backups.js';
import {createStore} from '../src/store.js';
const [source,target]=process.argv.slice(2);if(!source||!target||resolve(source)===resolve(target))throw new Error('Usage: node backend/scripts/restore-backup.js backup-file NEW-test.sqlite');
try{await access(target);throw new Error('Restore target must not already exist')}catch(e){if(e.code!=='ENOENT')throw e}
const db=decryptBackup(await readFile(source),process.env.BACKUP_KEY),store=createStore(target);
try{Object.assign(store.db,db);store.save()}finally{store.close()}
const check=createStore(target);try{if(check.db.users.length!==db.users.length||check.db.tasks.length!==db.tasks.length)throw new Error('Restore verification failed');console.log('Backup restored into a NEW local SQLite database and reopened successfully. Production database unchanged.')}finally{check.close()}
