const { createUniversity, createUser, createCourse, enroll, client } = require('./helpers');

describe('timetable', () => {
  let lecturer, otherLecturer, student, bystander, courseA, courseB;

  beforeAll(async () => {
    const university = await createUniversity();
    lecturer = await createUser(university, 'LECTURER');
    otherLecturer = await createUser(university, 'LECTURER');
    student = await createUser(university);
    bystander = await createUser(university);
    courseA = await createCourse(university, lecturer);
    courseB = await createCourse(university, otherLecturer);
    await enroll(student, courseA);
  });

  const slot = (over = {}) => ({ dayOfWeek: 'MON', startTime: '08:00', endTime: '10:00', room: 'B201', ...over });
  const addSlot = (user, course, over) => client(user.token).post(`/courses/${course.id}/slots`, slot(over));

  test('only the course lecturer can add sessions', async () => {
    expect((await addSlot(student, courseA)).status).toBe(403);
    expect((await addSlot(otherLecturer, courseA)).status).toBe(403);
    expect((await addSlot(lecturer, courseA)).status).toBe(201);
  });

  test('times must be HH:MM and the end must be after the start', async () => {
    expect((await addSlot(lecturer, courseA, { startTime: '8am' })).status).toBe(400);
    expect((await addSlot(lecturer, courseA, { startTime: '11:00', endTime: '09:00' })).status).toBe(400);
  });

  test('sessions of the same course cannot overlap', async () => {
    const res = await addSlot(lecturer, courseA, { startTime: '09:00', endTime: '11:00', room: 'C100' });
    expect(res.status).toBe(409);
  });

  test('back-to-back sessions are fine', async () => {
    const res = await addSlot(lecturer, courseA, { startTime: '10:00', endTime: '12:00', room: 'C100' });
    expect(res.status).toBe(201);
  });

  test('a room cannot be double-booked by another course', async () => {
    const clash = await addSlot(otherLecturer, courseB, { startTime: '09:00', endTime: '10:00', room: 'B201' });
    expect(clash.status).toBe(409);
    const otherRoom = await addSlot(otherLecturer, courseB, { startTime: '09:00', endTime: '10:00', room: 'D400' });
    expect(otherRoom.status).toBe(201);
  });

  test('the weekly view only shows the viewer\'s own courses', async () => {
    const studentWeek = (await client(student.token).get('/timetable')).body.week;
    expect(studentWeek.MON).toHaveLength(2);
    expect(studentWeek.MON.every((session) => session.course.id === courseA.id)).toBe(true);

    expect((await client(bystander.token).get('/timetable')).body.week.MON).toHaveLength(0);

    const teacherWeek = (await client(otherLecturer.token).get('/timetable')).body.week;
    expect(teacherWeek.MON.every((session) => session.course.id === courseB.id)).toBe(true);
  });
});
