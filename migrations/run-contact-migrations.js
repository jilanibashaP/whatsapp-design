// Run database migrations for contact sync
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration(filename) {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`\n📦 Running migration: ${filename}`);
    await client.query(sql);
    console.log(`✅ Migration completed: ${filename}\n`);
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Starting corporate contacts migrations...\n');
    
    // Run migrations in order
    await runMigration('create_corporate_contacts.sql');
    
    console.log('✅ All migrations completed successfully!');
    
    // Show summary
    const client = await pool.connect();
    try {
      const corporateCount = await client.query('SELECT COUNT(*) as count FROM corporate_contacts');
      const userContactCount = await client.query('SELECT COUNT(*) as count FROM user_contacts');
      
      console.log('\n📊 Database Summary:');
      console.log(`   Corporate Contacts: ${corporateCount.rows[0].count}`);
      console.log(`   User Contacts: ${userContactCount.rows[0].count}`);
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
