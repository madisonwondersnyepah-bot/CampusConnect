const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const UNIVERSITIES = [
  { name: 'University of Rwanda', city: 'Kigali' },
  { name: 'African Leadership University (ALU)', city: 'Kigali' },
  { name: 'Université Libre de Kigali (ULK)', city: 'Kigali' },
  { name: 'University of Lay Adventists of Kigali (UNILAK)', city: 'Kigali' },
  { name: 'Adventist University of Central Africa (AUCA)', city: 'Kigali' },
  { name: 'Mount Kigali University Rwanda (MKU)', city: 'Kigali' },
];

async function main() {
  const universities = {};
  for (const u of UNIVERSITIES) {
    universities[u.name] = await prisma.university.upsert({
      where: { name: u.name },
      update: {},
      create: u,
    });
  }

  // Demo accounts live at the first university (local development only)
  const uni = universities['University of Rwanda'];
  const passwordHash = await bcrypt.hash('Password123!', 12);

  await prisma.user.upsert({
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

  console.log('Universities:');
  Object.values(universities).forEach((u) => console.log(`  ${u.name}  (${u.id})`));
}

main().finally(() => prisma.$disconnect());