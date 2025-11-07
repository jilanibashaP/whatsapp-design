const dotenv = require('dotenv');
const path = require('path');

const envPath = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envPath) });

module.exports = process.env;
