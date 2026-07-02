const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'steg_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+01:00'
});

pool.getConnection()
  .then(conn => { console.log('✅ MySQL STEG connecté'); conn.release(); })
  .catch(err => console.error('❌ Erreur MySQL:', err.message));

module.exports = pool;
