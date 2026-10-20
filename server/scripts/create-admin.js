const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const [email, name, password, universityKey] = process.argv.slice(2);

if (!email || !name || !password || !universityKey) {
  console.log('Usage: node scripts/create-admin.js <email> "<full name>" "<password>" <university keyword>');
  console.log('Example: node scripts/create-admin.js admin@alu.test "ALU Admin" "Password123!" ALU');
  process.exit(1);
}

async function main() {
  const uni = await prisma.university.findFirst({
    where: { name: { contains: universityKey, mode: 'insensitive' } },
  });
  if (!uni) throw new Error(`No university matches "${universityKey}"`);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      role: 'ADMIN',
      universityId: uni.id,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`Created admin ${user.email} for ${uni.name}`);
}

main()
  .catch((e) => console.error(e.code === 'P2002' ? 'That email is already registered' : e.message))
  .finally(() => prisma.$disconnect());