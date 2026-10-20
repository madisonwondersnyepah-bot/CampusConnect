const { createUniversity, createUser, createCourse, enroll, inDays, ids, client } = require('./helpers');

describe('announcements', () => {
  let uni, admin, lecturer, otherLecturer, rep, outsideRep, student, outsider, course;
  let campusPost, coursePost;

  beforeAll(async () => {
    uni = await createUniversity();
    admin = await createUser(uni, 'ADMIN');
    lecturer = await createUser(uni, 'LECTURER');
    otherLecturer = await createUser(uni, 'LECTURER');
    rep = await createUser(uni, 'REP');
    outsideRep = await createUser(uni, 'REP');
    student = await createUser(uni, 'STUDENT');
    outsider = await createUser(uni, 'STUDENT');
    course = await createCourse(uni, lecturer);
    await enroll(rep, course);
    await enroll(student, course);
  });

  const post = (user, body) =>
    client(user.token).post('/announcements', { title: 'Hello', body: 'Body text', ...body });

  describe('who can post', () => {
    test('students cannot post', async () => {
      expect((await post(student)).status).toBe(403);
    });

    test('reps and admins can post campus-wide; lecturers cannot', async () => {
      const res = await post(rep);
      expect(res.status).toBe(201);
      campusPost = res.body.announcement;
      expect((await post(admin)).status).toBe(201);
      expect((await post(lecturer)).status).toBe(403);
    });

    test('only lecturers and admins can pin', async () => {
      expect((await post(rep, { pinned: true })).status).toBe(403);
      const res = await post(lecturer, { courseId: course.id, pinned: true });
      expect(res.status).toBe(201);
      expect(res.body.announcement.pinned).toBe(true);
      coursePost = res.body.announcement;
    });

    test('course posts: the course lecturer, admins and enrolled reps only', async () => {
      expect((await post(rep, { courseId: course.id })).status).toBe(201);
      expect((await post(admin, { courseId: course.id })).status).toBe(201);
      expect((await post(outsideRep, { courseId: course.id })).status).toBe(403);
      expect((await post(otherLecturer, { courseId: course.id })).status).toBe(403);
      expect((await post(lecturer, { courseId: 'does-not-exist' })).status).toBe(404);
    });
  });

  describe('who can read', () => {
    test('campus-wide posts reach everyone, course posts only the course', async () => {
      const inCourse = await client(student.token).get('/announcements');
      expect(ids(inCourse.body.announcements)).toEqual(expect.arrayContaining([campusPost.id, coursePost.id]));

      const notInCourse = await client(outsider.token).get('/announcements');
      expect(ids(notInCourse.body.announcements)).toContain(campusPost.id);
      expect(ids(notInCourse.body.announcements)).not.toContain(coursePost.id);
    });

    test('pinned posts come first', async () => {
      const res = await client(student.token).get('/announcements');
      expect(res.body.announcements[0].id).toBe(coursePost.id);
    });

    test('opening a course post directly is forbidden to non-members', async () => {
      expect((await client(outsider.token).get(`/announcements/${coursePost.id}`)).status).toBe(403);
      expect((await client(student.token).get(`/announcements/${coursePost.id}`)).status).toBe(200);
    });

    test('another university sees nothing', async () => {
      const foreign = await createUser(await createUniversity());
      expect((await client(foreign.token).get(`/announcements/${campusPost.id}`)).status).toBe(404);
      const feed = await client(foreign.token).get('/announcements');
      expect(feed.body.announcements).toHaveLength(0);
    });
  });

  describe('who can delete', () => {
    test('a rep cannot delete a lecturer\'s post', async () => {
      expect((await client(rep.token).delete(`/announcements/${coursePost.id}`)).status).toBe(403);
    });

    test('authors can delete their own posts', async () => {
      const own = (await post(rep)).body.announcement;
      expect((await client(rep.token).delete(`/announcements/${own.id}`)).status).toBe(204);
    });

    test('the course lecturer can moderate a rep\'s course post; another lecturer cannot', async () => {
      const repPost = (await post(rep, { courseId: course.id })).body.announcement;
      expect((await client(otherLecturer.token).delete(`/announcements/${repPost.id}`)).status).toBe(403);
      expect((await client(lecturer.token).delete(`/announcements/${repPost.id}`)).status).toBe(204);
    });

    test('admins can delete anything', async () => {
      expect((await client(admin.token).delete(`/announcements/${coursePost.id}`)).status).toBe(204);
    });
  });
});

describe('events', () => {
  let admin, lecturer, rep, student, foreign;

  beforeAll(async () => {
    const university = await createUniversity();
    admin = await createUser(university, 'ADMIN');
    lecturer = await createUser(university, 'LECTURER');
    rep = await createUser(university, 'REP');
    student = await createUser(university, 'STUDENT');
    foreign = await createUser(await createUniversity());
  });

  const event = (over = {}) => ({ title: 'Career fair', startsAt: inDays(7), endsAt: inDays(8), ...over });
  const create = (user, over) => client(user.token).post('/events', event(over));
  let repEvent, lecturerEvent;

  test('students cannot create events; reps and lecturers can', async () => {
    expect((await create(student)).status).toBe(403);
    const repResponse = await create(rep);
    const lecturerResponse = await create(lecturer);
    expect(repResponse.status).toBe(201);
    expect(lecturerResponse.status).toBe(201);
    repEvent = repResponse.body.event;
    lecturerEvent = lecturerResponse.body.event;
  });

  test('past start times and end-before-start are rejected', async () => {
    expect((await create(rep, { startsAt: '2020-01-01T10:00:00Z', endsAt: null })).status).toBe(400);
    expect((await create(rep, { startsAt: inDays(2), endsAt: inDays(1) })).status).toBe(400);
  });

  test('everyone at the university sees upcoming events; other universities do not', async () => {
    const mine = await client(student.token).get('/events');
    expect(ids(mine.body.events)).toEqual(expect.arrayContaining([repEvent.id, lecturerEvent.id]));
    expect((await client(foreign.token).get('/events')).body.events).toHaveLength(0);
  });

  test('a rep cannot delete a lecturer\'s event, but creators and admins can', async () => {
    expect((await client(rep.token).delete(`/events/${lecturerEvent.id}`)).status).toBe(403);
    expect((await client(lecturer.token).delete(`/events/${lecturerEvent.id}`)).status).toBe(204);
    expect((await client(admin.token).delete(`/events/${repEvent.id}`)).status).toBe(204);
  });
});
