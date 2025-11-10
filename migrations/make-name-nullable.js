/**
 * Migration: Make 'name' column nullable in users table
 * This allows users to register with phone number only and add their name later
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'whatsapp_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    console.log('🔄 Making name column nullable...');
    
    // Make name column nullable
    await sequelize.query(`
      ALTER TABLE users 
      ALTER COLUMN name DROP NOT NULL;
    `);

    console.log('✓ Name column is now nullable');

    // Add comment for documentation
    await sequelize.query(`
      COMMENT ON COLUMN users.name IS 'User display name (can be set after registration)';
    `);

    console.log('✓ Migration completed successfully!\n');
    
    // Verify the change
    const [results] = await sequelize.query(`
      SELECT 
        column_name, 
        is_nullable, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'name';
    `);

    console.log('📋 Verification:');
    console.table(results);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✓ Database connection closed');
  }
}

runMigration();
