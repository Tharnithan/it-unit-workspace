import mysql from 'mysql2/promise';
import {mysqlConfig} from '../src/database/config.js';
const connection=await mysql.createConnection(mysqlConfig());
try{
 const [columns]=await connection.query("SHOW COLUMNS FROM users LIKE 'email_verification'");
 if(!columns.length)await connection.query('ALTER TABLE users ADD COLUMN email_verification TEXT NULL');
 await connection.query('CREATE TABLE IF NOT EXISTS workspace_items (id VARCHAR(64) PRIMARY KEY, kind VARCHAR(200) NOT NULL, payload LONGTEXT NOT NULL, position INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
 console.log('Workspace schema ready. Existing records retained.');
}finally{await connection.end()}
