const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Determine .env file path
const envPath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

// Try multiple locations for .env file
const possiblePaths = [
  path.resolve(process.cwd(), envPath),           // Current directory
  path.resolve(process.cwd(), '..', envPath),     // Parent directory
  path.resolve(__dirname, '..', '..', envPath),   // Project root from src/config
];

let envFilePath = null;
for (const tryPath of possiblePaths) {
  if (fs.existsSync(tryPath)) {
    envFilePath = tryPath;
    break;
  }
}

if (!envFilePath) {
  console.warn('⚠️  Warning: .env file not found in any of these locations:');
  possiblePaths.forEach(p => console.warn('   -', p));
} else {
  const result = dotenv.config({ path: envFilePath });
  if (result.error) {
    console.warn('⚠️  Warning: Error loading .env file:', result.error.message);
  }
}

// Export all environment variables
module.exports = process.env;
