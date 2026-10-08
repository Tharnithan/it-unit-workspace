import '../src/database/config.js';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createMySQLStore} from '../src/database/mysql-store.js';
import {toRecords} from '../src/database/records.js';

const source=new DatabaseSync(fileURLToPath(new URL('../data/workspace.sqlite',import.meta.url)),{readOnly:true});
const data={};
try{source.exec('BEGIN');for(const name of ['users','tasks','meetings','conversations','messages','notifications','audit','sessions','pushSubscriptions','pushOutbox'])data[name]=source.prepare(`SELECT data FROM "${name}" ORDER BY rowid`).all().map(r=>JSON.parse(r.data));source.exec('COMMIT')}finally{source.close()}
const target=await createMySQLStore();
try{assert.deepEqual(toRecords(target.db),toRecords(data));console.log('Migration verified: all account hashes, task history, messages, meetings, notifications and other records match SQLite.')}finally{await target.close()}
