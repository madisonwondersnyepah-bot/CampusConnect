const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const uni = await prisma.university.upsert({
    where: { name: 'University of Rwanda' },
    update: {},
    create: { name: 'University of Rwanda', city: 'Kigali' },
  });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@campusconnect.test' },
    update: {},
    create: { name: 'Admin User', email: 'admin@campusconnect.test', passwordHash, role: 'ADMIN', universityId: uni.id },
  });

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@campusconnect.test' },
    update: {},
    create: { name: 'Dr. Uwase', email: 'lecturer@campusconnect.test', passwordHash, role: 'LECTURER', universityId: uni.id },
  });

  await prisma.course.upsert({
    where: { universityId_code_semester: { universityId: uni.id, code: 'CS101', semester: '2026-A' } },
    update: {},
    create: { code: 'CS101', title: 'Intro to Programming', semester: '2026-A', universityId: uni.id, lecturerId: lecturer.id },
  });

  console.log('University id:', uni.id);
  console.log('Seeded admin and lecturer (password: Password123!)');
}

main().finally(() => prisma.$disconnect());