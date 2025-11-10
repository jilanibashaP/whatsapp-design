/**
 * Database Schema Checker
 * This script checks which columns exist in the users table
 * Usage: node migrations/check-schema.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const requiredColumns = [
  'id',
  'name',
  'phone_number',
  'profile_pic',
  'about',
  'created_at',
  'email',
  'last_seen',
  'is_online',
  'otp',
  'otp_expiry',
  'otp_attempts',
  'is_verified'
];

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking users table schema...\n');
    
    // Get all columns from users table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current columns in users table:');
    console.table(result.rows);
    
    // Check which required columns are missing
    const existingColumns = result.rows.map(row => row.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing columns:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n💡 Run migration to add missing columns: node migrations/run-migration.js\n');
    } else {
      console.log('\n✅ All required columns exist!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
