/**
 * Rename Status to About Migration Runner
 * This script renames the 'status' column to 'about' in the users table
 * Usage: node migrations/rename-status-to-about.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: status → about\n');
    
    // Check current state
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' 
      AND column_name IN ('status', 'about')
      ORDER BY column_name;
    `);
    
    console.log('📋 Current state:');
    console.log('   Columns found:', checkColumns.rows.map(r => r.column_name).join(', ') || 'none');
    console.log('');
    
    // Read and execute the migration SQL file
    const migrationPath = path.join(__dirname, 'rename_status_to_about.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the result
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('status', 'about')
      ORDER BY column_name;
    `);
    
    console.log('📋 Final state:');
    if (result.rows.length > 0) {
      console.table(result.rows);
    } else {
      console.log('   No status or about columns found');
    }
    
    // Check if we have any users and show sample data
    const sampleData = await client.query(`
      SELECT id, name, about 
      FROM users 
      LIMIT 3;
    `);
    
    if (sampleData.rows.length > 0) {
      console.log('\n📝 Sample user data:');
      console.table(sampleData.rows);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✨ All done! The status column has been renamed to about.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
