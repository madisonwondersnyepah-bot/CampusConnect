const prisma = require('../src/config/db');
const { createUniversity, createUser, createCourse, enroll, ids, client } = require('./helpers');

describe('courses and enrollment', () => {
  let uni, admin, lecturer, otherLecturer, student;
  let foreignAdmin, foreignLecturer, foreignStudent;
  let course;

  beforeAll(async () => {
    uni = await createUniversity();
    const otherUni = await createUniversity();
    admin = await createUser(uni, 'ADMIN');
    lecturer = await createUser(uni, 'LECTURER');
    otherLecturer = await createUser(uni, 'LECTURER');
    student = await createUser(uni, 'STUDENT');
    foreignAdmin = await createUser(otherUni, 'ADMIN');
    foreignLecturer = await createUser(otherUni, 'LECTURER');
    foreignStudent = await createUser(otherUni, 'STUDENT');
    course = await createCourse(uni, lecturer);
  });

  describe('creating courses', () => {
    const body = { code: 'cs303', title: 'Algorithms', semester: '2026-A' };

    test('an admin can, and the code is normalised to upper case', async () => {
      const res = await client(admin.token).post('/courses', body);
      expect(res.status).toBe(201);
      expect(res.body.course.code).toBe('CS303');
    });

    test('students and lecturers cannot; anonymous users are rejected', async () => {
      for (const user of [student, lecturer]) {
        expect((await client(user.token).post('/courses', { ...body, code: 'NOPE1' })).status).toBe(403);
      }
      expect((await client().post('/courses', body)).status).toBe(401);
    });

    test('a duplicate code in the same semester is rejected', async () => {
      const duplicate = { code: 'DUP100', title: 'Duplicate', semester: '2026-A' };
      expect((await client(admin.token).post('/courses', duplicate)).status).toBe(201);
      expect((await client(admin.token).post('/courses', duplicate)).status).toBe(409);
    });

    test('only an active lecturer from the same university can be assigned', async () => {
      const base = { code: 'ASSIGN1', title: 'Assigned', semester: '2026-A' };
      expect((await client(admin.token).post('/courses', { ...base, lecturerId: student.id })).status).toBe(400);
      expect((await client(admin.token).post('/courses', { ...base, lecturerId: foreignLecturer.id })).status).toBe(400);
      expect((await client(admin.token).post('/courses', { ...base, lecturerId: lecturer.id })).status).toBe(201);
    });
  });

  describe('enrollment', () => {
    test('students can enroll once, and leave', async () => {
      const user = await createUser(uni);
      expect((await client(user.token).post(`/courses/${course.id}/enroll`)).status).toBe(201);
      expect((await client(user.token).post(`/courses/${course.id}/enroll`)).status).toBe(409);
      expect((await client(user.token).delete(`/courses/${course.id}/enroll`)).status).toBe(204);
      expect((await client(user.token).delete(`/courses/${course.id}/enroll`)).status).toBe(404);
    });

    test('admins and lecturers cannot enroll', async () => {
      for (const user of [admin, lecturer]) {
        expect((await client(user.token).post(`/courses/${course.id}/enroll`)).status).toBe(403);
      }
    });

    test('unknown courses and other universities courses are "not found"', async () => {
      expect((await client(student.token).post('/courses/does-not-exist/enroll')).status).toBe(404);
      expect((await client(foreignStudent.token).post(`/courses/${course.id}/enroll`)).status).toBe(404);
    });
  });

  describe('roster access', () => {
    let enrolled;
    beforeAll(async () => {
      enrolled = await createUser(uni);
      await enroll(enrolled, course);
    });

    test('enrolled students and unrelated lecturers are forbidden', async () => {
      expect((await client(enrolled.token).get(`/courses/${course.id}/students`)).status).toBe(403);
      expect((await client(otherLecturer.token).get(`/courses/${course.id}/students`)).status).toBe(403);
    });

    test('the course lecturer and admins can see it', async () => {
      for (const user of [lecturer, admin]) {
        const res = await client(user.token).get(`/courses/${course.id}/students`);
        expect(res.status).toBe(200);
        expect(ids(res.body.students)).toContain(enrolled.id);
      }
    });

    test('an admin from another university gets "not found"', async () => {
      expect((await client(foreignAdmin.token).get(`/courses/${course.id}/students`)).status).toBe(404);
    });

    test('only managers can remove a student from a course', async () => {
      expect((await client(enrolled.token).delete(`/courses/${course.id}/students/${enrolled.id}`)).status).toBe(403);
      expect((await client(otherLecturer.token).delete(`/courses/${course.id}/students/${enrolled.id}`)).status).toBe(403);
      expect((await client(lecturer.token).delete(`/courses/${course.id}/students/${enrolled.id}`)).status).toBe(204);
    });
  });

  describe('university isolation', () => {
    test('courses from another university are invisible', async () => {
      const list = await client(foreignStudent.token).get('/courses');
      expect(ids(list.body.courses)).not.toContain(course.id);
      expect((await client(foreignStudent.token).get(`/courses/${course.id}`)).status).toBe(404);
    });

    test('an admin from another university cannot change or delete them', async () => {
      expect((await client(foreignAdmin.token).patch(`/courses/${course.id}`, { title: 'Hacked' })).status).toBe(404);
      expect((await client(foreignAdmin.token).delete(`/courses/${course.id}`)).status).toBe(404);
      expect(await prisma.course.findUnique({ where: { id: course.id } })).not.toBeNull();
    });

    test('an admin from the same university can delete a course', async () => {
      const throwaway = await createCourse(uni);
      expect((await client(admin.token).delete(`/courses/${throwaway.id}`)).status).toBe(204);
    });
  });
});
