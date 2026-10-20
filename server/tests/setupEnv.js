const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL is not set. Create server/.env.test (see README).');
}

const fingerprint = (url) => {
  const parsedUrl = new URL(url);
  return `${parsedUrl.hostname.replace('-pooler', '')}${parsedUrl.pathname}`;
};

try {
  const dev = dotenv.parse(fs.readFileSync(path.join(__dirname, '..', '.env')));
  if (dev.DATABASE_URL && fingerprint(dev.DATABASE_URL) === fingerprint(testUrl)) {
    throw new Error('TEST_DATABASE_URL points at the same database as DATABASE_URL in .env. Use a separate database for tests.');
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testUrl;
process.env.JWT_ACCESS_SECRET = 'test-secret-not-for-production';
