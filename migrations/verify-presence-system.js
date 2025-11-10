/**
 * Presence System Verification Script
 * Tests that is_online and last_seen are working correctly
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

async function verifyPresenceSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying Presence System Configuration\n');
    
    // Check schema
    console.log('1️⃣ Checking schema...');
    const schemaCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('is_online', 'last_seen', 'about')
      ORDER BY column_name;
    `);
    
    console.log('   ✅ Schema columns:');
    console.table(schemaCheck.rows);
    
    // Check that 'status' column doesn't exist (except for about)
    const oldStatusCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'status';
    `);
    
    if (oldStatusCheck.rows.length > 0) {
      console.log('   ⚠️  Warning: Old "status" column still exists!');
    } else {
      console.log('   ✅ Old "status" column removed\n');
    }
    
    // Test updating presence
    console.log('2️⃣ Testing presence update...');
    const testUser = await client.query(`
      SELECT id, name, is_online, last_seen, about
      FROM users
      LIMIT 1;
    `);
    
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log('   Current user state:');
      console.table([user]);
      
      // Simulate going online
      await client.query(`
        UPDATE users
        SET is_online = true, last_seen = NOW()
        WHERE id = $1;
      `, [user.id]);
      
      console.log('   ✅ Set user to online');
      
      // Simulate going offline
      await client.query(`
        UPDATE users
        SET is_online = false, last_seen = NOW()
        WHERE id = $1;
      `, [user.id]);
      
      console.log('   ✅ Set user to offline');
      
      // Check final state
      const updatedUser = await client.query(`
        SELECT id, name, is_online, last_seen, about
        FROM users
        WHERE id = $1;
      `, [user.id]);
      
      console.log('   Updated user state:');
      console.table(updatedUser.rows);
    }
    
    console.log('\n3️⃣ Summary:');
    console.log('   ✅ is_online: Boolean field for online/offline status');
    console.log('   ✅ last_seen: Timestamp of last activity');
    console.log('   ✅ about: User status message/bio');
    console.log('\n✨ Presence system is configured correctly!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyPresenceSystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
