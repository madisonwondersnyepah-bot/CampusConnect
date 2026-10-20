const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');
const { PASSWORD, uid, createUniversity, createUser, createCourse, ids, client } = require('./helpers');

const login = (email, password = PASSWORD) =>
  request(app).post('/api/auth/login').send({ email, password });

describe('admin dashboard', () => {
  let uni, admin, lecturer, student, rep, foreignStudent;

  beforeAll(async () => {
    uni = await createUniversity();
    admin = await createUser(uni, 'ADMIN');
    lecturer = await createUser(uni, 'LECTURER');
    student = await createUser(uni, 'STUDENT');
    rep = await createUser(uni, 'REP');
    foreignStudent = await createUser(await createUniversity(), 'STUDENT');
  });

  describe('access control', () => {
    test('only admins can reach admin routes', async () => {
      for (const user of [student, rep, lecturer]) {
        expect((await client(user.token).get('/admin/stats')).status).toBe(403);
        expect((await client(user.token).get('/admin/users')).status).toBe(403);
        expect((await client(user.token).post('/admin/users', {})).status).toBe(403);
      }
      expect((await client().get('/admin/stats')).status).toBe(401);
    });
  });

  describe('data is scoped to the admin\'s university', () => {
    test('stats only count this university', async () => {
      const res = await client(admin.token).get('/admin/stats');
      expect(res.status).toBe(200);
      const expected = await prisma.user.count({ where: { universityId: uni.id } });
      expect(res.body.users.total).toBe(expected);
    });

    test('the user list excludes other universities, and filters by role', async () => {
      const all = await client(admin.token).get('/admin/users?limit=100');
      expect(ids(all.body.users)).toContain(student.id);
      expect(ids(all.body.users)).not.toContain(foreignStudent.id);

      const lecturers = await client(admin.token).get('/admin/users?role=LECTURER');
      expect(lecturers.body.users.every((user) => user.role === 'LECTURER')).toBe(true);
    });

    test('users from another university cannot be viewed, changed or reset', async () => {
      expect((await client(admin.token).get(`/admin/users/${foreignStudent.id}`)).status).toBe(404);
      expect((await client(admin.token).patch(`/admin/users/${foreignStudent.id}`, { role: 'ADMIN' })).status).toBe(404);
      expect((await client(admin.token).post(`/admin/users/${foreignStudent.id}/reset-password`, { newPassword: 'NewPass1234' })).status).toBe(404);
    });
  });

  describe('creating users', () => {
    test('an admin can create a lecturer, who can then log in', async () => {
      const email = `new-lecturer-${uid()}@test.dev`;
      const res = await client(admin.token).post('/admin/users', {
        name: 'New Lecturer', email, password: 'TempPass123', role: 'LECTURER',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('LECTURER');
      expect(res.body.user.passwordHash).toBeUndefined();
      expect((await login(email, 'TempPass123')).status).toBe(200);
    });

    test('duplicate emails and weak passwords are rejected', async () => {
      const body = { name: 'Dup', email: student.email, password: 'TempPass123', role: 'STUDENT' };
      expect((await client(admin.token).post('/admin/users', body)).status).toBe(409);
      expect((await client(admin.token).post('/admin/users', { ...body, email: `x-${uid()}@test.dev`, password: 'short' })).status).toBe(400);
    });
  });

  describe('changing roles', () => {
    test('a promotion applies to the user\'s existing token immediately', async () => {
      const target = await createUser(uni, 'STUDENT');
      expect((await client(admin.token).patch(`/admin/users/${target.id}`, { role: 'REP' })).status).toBe(200);
      const me = await client(target.token).get('/auth/me');
      expect(me.body.user.role).toBe('REP');
    });

    test('admins cannot change their own role or deactivate themselves', async () => {
      expect((await client(admin.token).patch(`/admin/users/${admin.id}`, { role: 'STUDENT' })).status).toBe(403);
      expect((await client(admin.token).patch(`/admin/users/${admin.id}`, { isActive: false })).status).toBe(403);
    });

    test('an admin can demote another admin, who then loses access', async () => {
      const other = await createUser(uni, 'ADMIN');
      expect((await client(other.token).get('/admin/stats')).status).toBe(200);
      expect((await client(admin.token).patch(`/admin/users/${other.id}`, { role: 'STUDENT' })).status).toBe(200);
      expect((await client(other.token).get('/admin/stats')).status).toBe(403);
    });

    test('demoting a lecturer unassigns their courses', async () => {
      const teacher = await createUser(uni, 'LECTURER');
      const course = await createCourse(uni, teacher);
      const res = await client(admin.token).patch(`/admin/users/${teacher.id}`, { role: 'STUDENT' });
      expect(res.status).toBe(200);
      expect(res.body.coursesUnassigned).toBe(1);
      expect((await prisma.course.findUnique({ where: { id: course.id } })).lecturerId).toBeNull();
    });
  });

  describe('deactivation and password resets', () => {
    test('deactivating locks a user out at once, with their old token and at login', async () => {
      const target = await createUser(uni, 'STUDENT');
      expect((await client(target.token).get('/auth/me')).status).toBe(200);
      expect((await client(admin.token).patch(`/admin/users/${target.id}`, { isActive: false })).status).toBe(200);
      expect((await client(target.token).get('/auth/me')).status).toBe(401);
      expect((await login(target.email)).status).toBe(401);
    });

    test('resetting a password signs the user out everywhere', async () => {
      const target = await createUser(uni, 'STUDENT');
      const session = await login(target.email);
      const cookie = session.headers['set-cookie'].find((value) => value.startsWith('refreshToken=')).split(';')[0];

      const reset = await client(admin.token).post(`/admin/users/${target.id}/reset-password`, { newPassword: 'BrandNew456' });
      expect(reset.status).toBe(204);

      expect((await login(target.email)).status).toBe(401);
      expect((await login(target.email, 'BrandNew456')).status).toBe(200);
      expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
    });
  });
});
