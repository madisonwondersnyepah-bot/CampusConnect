const { createUniversity, createUser, ids, client } = require('./helpers');

describe('study groups and notes', () => {
  let owner, member, member2, stranger, foreign;
  let privateGroup, publicGroup;

  beforeAll(async () => {
    const university = await createUniversity();
    owner = await createUser(university);
    member = await createUser(university);
    member2 = await createUser(university);
    stranger = await createUser(university);
    foreign = await createUser(await createUniversity());
  });

  const createGroup = (user, body) => client(user.token).post('/study-groups', { name: 'Exam prep', ...body });
  const groupUrl = (group, suffix = '') => `/study-groups/${group.id}${suffix}`;

  test('creating a group makes you its owner', async () => {
    const res = await createGroup(owner, { name: 'Secret revision', isPrivate: true });
    expect(res.status).toBe(201);
    expect(res.body.group.myRole).toBe('OWNER');
    expect(res.body.group.memberCount).toBe(1);
    privateGroup = res.body.group;
    publicGroup = (await createGroup(owner, { name: 'Open revision' })).body.group;
  });

  describe('private groups are invisible to outsiders', () => {
    test('direct access and listing both say "not found"', async () => {
      expect((await client(stranger.token).get(groupUrl(privateGroup))).status).toBe(404);
      const list = await client(stranger.token).get('/study-groups');
      expect(ids(list.body.groups)).toContain(publicGroup.id);
      expect(ids(list.body.groups)).not.toContain(privateGroup.id);
    });

    test('they cannot join it or read its notes', async () => {
      expect((await client(stranger.token).post(groupUrl(privateGroup, '/join'))).status).toBe(404);
      expect((await client(stranger.token).get(groupUrl(privateGroup, '/notes'))).status).toBe(404);
    });

    test('other universities cannot see even public groups', async () => {
      expect((await client(foreign.token).get(groupUrl(publicGroup))).status).toBe(404);
      expect(ids((await client(foreign.token).get('/study-groups')).body.groups)).not.toContain(publicGroup.id);
    });
  });

  describe('public groups', () => {
    test('anyone at the university can view one, but not its members or notes', async () => {
      const res = await client(stranger.token).get(groupUrl(publicGroup));
      expect(res.status).toBe(200);
      expect(res.body.group.myRole).toBeNull();
      expect(res.body.members).toBeUndefined();
      expect((await client(stranger.token).get(groupUrl(publicGroup, '/notes'))).status).toBe(403);
    });

    test('joining works once', async () => {
      expect((await client(member.token).post(groupUrl(publicGroup, '/join'))).status).toBe(201);
      expect((await client(member.token).post(groupUrl(publicGroup, '/join'))).status).toBe(409);
    });
  });

  describe('membership', () => {
    test('the owner invites members by email, and members then see the group', async () => {
      const invite = (user) => client(owner.token).post(groupUrl(privateGroup, '/members'), { email: user.email });
      expect((await invite(member)).status).toBe(201);
      expect((await invite(member2)).status).toBe(201);
      expect((await invite(member2)).status).toBe(409);
      expect((await client(owner.token).post(groupUrl(privateGroup, '/members'), { email: 'nobody@test.dev' })).status).toBe(404);

      const view = await client(member.token).get(groupUrl(privateGroup));
      expect(view.status).toBe(200);
      expect(view.body.members).toHaveLength(3);
    });

    test('regular members cannot manage the group', async () => {
      expect((await client(member.token).post(groupUrl(privateGroup, '/members'), { email: stranger.email })).status).toBe(403);
      expect((await client(member.token).patch(groupUrl(privateGroup), { name: 'Renamed' })).status).toBe(403);
      expect((await client(member.token).delete(groupUrl(privateGroup, `/members/${member2.id}`))).status).toBe(403);
      expect((await client(member.token).delete(groupUrl(privateGroup))).status).toBe(403);
    });
  });

  describe('shared notes', () => {
    let note;

    test('members can post and read', async () => {
      const res = await client(member.token).post(groupUrl(privateGroup, '/notes'), { title: 'Big-O', content: 'O(n log n)' });
      expect(res.status).toBe(201);
      note = res.body.note;

      const list = await client(owner.token).get(groupUrl(privateGroup, '/notes'));
      expect(ids(list.body.notes)).toContain(note.id);

      const one = await client(member2.token).get(`/notes/${note.id}`);
      expect(one.status).toBe(200);
      expect(one.body.canEdit).toBe(false);
    });

    test('non-members get "not found"', async () => {
      expect((await client(stranger.token).get(`/notes/${note.id}`)).status).toBe(404);
    });

    test('notes in public groups are members-only too', async () => {
      const res = await client(member.token).post(groupUrl(publicGroup, '/notes'), { title: 'Public note', content: 'x' });
      expect(res.status).toBe(201);
      expect((await client(stranger.token).get(`/notes/${res.body.note.id}`)).status).toBe(404);
    });

    test('only the author or the group owner can edit or delete', async () => {
      expect((await client(member2.token).patch(`/notes/${note.id}`, { title: 'Hijack' })).status).toBe(403);
      expect((await client(member2.token).delete(`/notes/${note.id}`)).status).toBe(403);
      expect((await client(member.token).patch(`/notes/${note.id}`, { title: 'Big-O notes' })).status).toBe(200);
      expect((await client(owner.token).patch(`/notes/${note.id}`, { title: 'Reviewed' })).status).toBe(200);
      expect((await client(owner.token).delete(`/notes/${note.id}`)).status).toBe(204);
    });
  });

  describe('personal notes', () => {
    test('only the author can see or change them', async () => {
      const res = await client(owner.token).post('/notes', { title: 'Diary', content: 'private' });
      expect(res.status).toBe(201);
      const id = res.body.note.id;

      expect((await client(owner.token).get(`/notes/${id}`)).status).toBe(200);
      expect((await client(member.token).get(`/notes/${id}`)).status).toBe(404);
      expect((await client(member.token).patch(`/notes/${id}`, { title: 'x' })).status).toBe(404);
      expect((await client(member.token).delete(`/notes/${id}`)).status).toBe(404);
      expect(ids((await client(member.token).get('/notes')).body.notes)).not.toContain(id);
    });
  });

  describe('leaving', () => {
    test('owners cannot leave; members can, and then lose access', async () => {
      expect((await client(owner.token).delete(groupUrl(privateGroup, '/members/me'))).status).toBe(400);
      expect((await client(member2.token).delete(groupUrl(privateGroup, '/members/me'))).status).toBe(204);
      expect((await client(member2.token).get(groupUrl(privateGroup))).status).toBe(404);
    });

    test('only the owner can delete the group', async () => {
      expect((await client(owner.token).delete(groupUrl(privateGroup))).status).toBe(204);
      expect((await client(owner.token).get(groupUrl(privateGroup))).status).toBe(404);
    });
  });
});
