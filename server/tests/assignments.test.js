const prisma = require('../src/config/db');
const { createUniversity, createUser, createCourse, enroll, inDays, ids, client } = require('./helpers');

describe('assignments, progress and reminders', () => {
  let admin, lecturer, otherLecturer, student, bystander, foreign, course, assignment;

  beforeAll(async () => {
    const university = await createUniversity();
    admin = await createUser(university, 'ADMIN');
    lecturer = await createUser(university, 'LECTURER');
    otherLecturer = await createUser(university, 'LECTURER');
    student = await createUser(university);
    bystander = await createUser(university);
    foreign = await createUser(await createUniversity());
    course = await createCourse(university, lecturer);
    await enroll(student, course);
  });

  const body = (over = {}) => ({ title: 'Linked list lab', description: 'Implement a list', dueAt: inDays(3), ...over });
  const create = (user, over) => client(user.token).post(`/courses/${course.id}/assignments`, body(over));

  describe('posting', () => {
    test('the course lecturer and admins can post', async () => {
      const res = await create(lecturer);
      expect(res.status).toBe(201);
      assignment = res.body.assignment;
      expect((await create(admin)).status).toBe(201);
    });

    test('students and other lecturers cannot', async () => {
      expect((await create(student)).status).toBe(403);
      expect((await create(otherLecturer)).status).toBe(403);
    });

    test('due dates in the past are rejected', async () => {
      expect((await create(lecturer, { dueAt: '2020-01-01T00:00:00Z' })).status).toBe(400);
    });
  });

  describe('visibility', () => {
    test('enrolled students see it, defaulting to TODO', async () => {
      const res = await client(student.token).get(`/courses/${course.id}/assignments`);
      expect(res.status).toBe(200);
      expect(res.body.assignments.find((item) => item.id === assignment.id).myStatus).toBe('TODO');
    });

    test('students who are not enrolled are blocked', async () => {
      expect((await client(bystander.token).get(`/courses/${course.id}/assignments`)).status).toBe(403);
      expect((await client(bystander.token).get(`/assignments/${assignment.id}`)).status).toBe(403);
      const feed = await client(bystander.token).get('/assignments');
      expect(ids(feed.body.assignments)).not.toContain(assignment.id);
    });

    test('another university gets "not found"', async () => {
      expect((await client(foreign.token).get(`/assignments/${assignment.id}`)).status).toBe(404);
    });
  });

  describe('progress', () => {
    const url = () => `/assignments/${assignment.id}/progress`;

    test('enrolled students update their own status; everyone else is refused', async () => {
      expect((await client(bystander.token).put(url(), { status: 'DONE' })).status).toBe(403);
      expect((await client(lecturer.token).put(url(), { status: 'DONE' })).status).toBe(403);
      expect((await client(student.token).put(url(), { status: 'NOPE' })).status).toBe(400);
      const ok = await client(student.token).put(url(), { status: 'IN_PROGRESS' });
      expect(ok.status).toBe(200);
      expect(ok.body.progress.status).toBe('IN_PROGRESS');
    });

    test('only course managers see class-wide progress', async () => {
      expect((await client(student.token).get(url())).status).toBe(403);
      expect((await client(otherLecturer.token).get(url())).status).toBe(403);
      const res = await client(lecturer.token).get(url());
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.summary.IN_PROGRESS).toBe(1);
    });
  });

  describe('reminders', () => {
    const url = () => `/assignments/${assignment.id}/reminders`;

    test('a reminder that would already be in the past is rejected', async () => {
      expect((await client(student.token).post(url(), { hoursBefore: 100 })).status).toBe(400);
    });

    test('students can set a reminder, but not twice for the same time', async () => {
      expect((await client(student.token).post(url(), { hoursBefore: 24 })).status).toBe(201);
      expect((await client(student.token).post(url(), { hoursBefore: 24 })).status).toBe(409);
    });

    test('lecturers and non-enrolled students cannot set reminders', async () => {
      expect((await client(lecturer.token).post(url(), { hoursBefore: 24 })).status).toBe(403);
      expect((await client(bystander.token).post(url(), { hoursBefore: 24 })).status).toBe(403);
    });

    test('only course managers can edit assignments', async () => {
      expect((await client(student.token).patch(`/assignments/${assignment.id}`, { title: 'Hacked' })).status).toBe(403);
      expect((await client(otherLecturer.token).patch(`/assignments/${assignment.id}`, { title: 'Hacked' })).status).toBe(403);
    });

    test('moving the due date shifts pending reminders by the same amount', async () => {
      const before = await prisma.reminder.findFirst({ where: { userId: student.id, assignmentId: assignment.id } });
      const newDue = new Date(new Date(assignment.dueAt).getTime() + 24 * 3600000).toISOString();

      const res = await client(lecturer.token).patch(`/assignments/${assignment.id}`, { dueAt: newDue });
      expect(res.status).toBe(200);

      const after = await prisma.reminder.findUnique({ where: { id: before.id } });
      expect(after.remindAt.getTime() - before.remindAt.getTime()).toBe(24 * 3600000);
    });

    test('marking an assignment DONE clears pending reminders', async () => {
      await client(student.token).put(`/assignments/${assignment.id}/progress`, { status: 'DONE' });
      const left = await prisma.reminder.count({
        where: { userId: student.id, assignmentId: assignment.id, sent: false },
      });
      expect(left).toBe(0);
    });
  });

  test('only the course lecturer can delete an assignment', async () => {
    expect((await client(otherLecturer.token).delete(`/assignments/${assignment.id}`)).status).toBe(403);
    expect((await client(lecturer.token).delete(`/assignments/${assignment.id}`)).status).toBe(204);
  });
});
