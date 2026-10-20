const bcrypt = require('bcryptjs');
const request = require('supertest');
const prisma = require('../src/config/db');
const app = require('../src/app');
const { signAccessToken } = require('../src/services/token.service');

const PASSWORD = 'Password123!';
const HASH = bcrypt.hashSync(PASSWORD, 4);

let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

async function resetDb() {
  if (process.env.NODE_ENV !== 'test') throw new Error('resetDb only runs when NODE_ENV=test');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "University" CASCADE');
}

const createUniversity = (name = `Test University ${uid()}`) =>
  prisma.university.create({ data: { name, city: 'Kigali' } });

async function createUser(university, role = 'STUDENT', overrides = {}) {
  const id = uid();
  const user = await prisma.user.create({
    data: {
      name: `${role} ${id}`,
      email: `${role.toLowerCase()}-${id}@test.dev`,
      passwordHash: HASH,
      role,
      universityId: university.id,
      ...overrides,
    },
  });
  return { ...user, token: signAccessToken(user) };
}

const createCourse = (university, lecturer = null, overrides = {}) =>
  prisma.course.create({
    data: {
      code: `C${uid()}`.toUpperCase(),
      title: 'Test Course',
      semester: '2026-A',
      universityId: university.id,
      lecturerId: lecturer ? lecturer.id : null,
      ...overrides,
    },
  });

const enroll = (user, course) =>
  prisma.enrollment.create({ data: { userId: user.id, courseId: course.id } });

const inHours = (n) => new Date(Date.now() + n * 3600000).toISOString();
const inDays = (n) => inHours(n * 24);
const ids = (list) => list.map((item) => item.id);

function client(token) {
  const auth = (req) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
  const url = (path) => `/api${path}`;
  return {
    get: (path) => auth(request(app).get(url(path))),
    post: (path, body = {}) => auth(request(app).post(url(path))).send(body),
    put: (path, body = {}) => auth(request(app).put(url(path))).send(body),
    patch: (path, body = {}) => auth(request(app).patch(url(path))).send(body),
    delete: (path) => auth(request(app).delete(url(path))),
  };
}

module.exports = {
  PASSWORD, uid, resetDb, createUniversity, createUser, createCourse, enroll,
  inHours, inDays, ids, client,
};
