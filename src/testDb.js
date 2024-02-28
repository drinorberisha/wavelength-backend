require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    console.log('Database Connection Test Successful:', rows[0]);
  } catch (error) {
    console.error('Database Connection Test Failed:', error);
  }
}

testConnection();
