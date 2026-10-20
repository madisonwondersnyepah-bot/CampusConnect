require('dotenv').config({ path: '.env.test' });
const { execSync } = require('child_process');

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error('TEST_DATABASE_URL is not set. Create server/.env.test first (see README).');
  process.exit(1);
}

console.log('Applying migrations to the TEST database...');
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
