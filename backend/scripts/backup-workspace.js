import '../src/database/config.js';
import {createMySQLStore} from '../src/database/mysql-store.js';
import {writeBackup} from '../src/backups.js';
if(!process.env.BACKUP_DIR||!process.env.BACKUP_KEY)throw new Error('Set BACKUP_DIR and BACKUP_KEY');
const store=await createMySQLStore();
try{await writeBackup(store.db,process.env.BACKUP_DIR,process.env.BACKUP_KEY);console.log('Encrypted backup saved and decrypted successfully for verification.')}finally{await store.close()}
