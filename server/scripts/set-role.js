const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const [email, role] = process.argv.slice(2);
const ROLES = ['STUDENT', 'REP', 'LECTURER', 'ADMIN'];

if (!email || !ROLES.includes(role)) {
  console.log('Usage: node scripts/set-role.js <email> <STUDENT|REP|LECTURER|ADMIN>');
  process.exit(1);
}

prisma.user
  .update({ where: { email }, data: { role } })
  .then((u) => console.log(`${u.email} is now ${u.role}`))
  .catch((e) => console.error(e.code === 'P2025' ? 'No user with that email' : e))
  .finally(() => prisma.$disconnect());