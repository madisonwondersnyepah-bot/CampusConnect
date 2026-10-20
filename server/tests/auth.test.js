const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/db');
const { PASSWORD, uid, createUniversity, createUser, client } = require('./helpers');

const refreshCookie = (res) =>
	res.headers['set-cookie'].find((cookie) => cookie.startsWith('refreshToken=')).split(';')[0];

describe('authentication', () => {
	let uni;
	beforeAll(async () => {
		uni = await createUniversity();
	});

	const register = (body) => request(app).post('/api/auth/register').send(body);
	const signup = (over = {}) => ({
		name: 'New Student',
		email: `new-${uid()}@test.dev`,
		password: PASSWORD,
		universityId: uni.id,
		...over,
	});
	const login = (email, password = PASSWORD) =>
		request(app).post('/api/auth/login').send({ email, password });

	describe('registration', () => {
		test('the university list is public', async () => {
			const res = await request(app).get('/api/auth/universities');
			expect(res.status).toBe(200);
			expect(res.body.universities.map((university) => university.id)).toContain(uni.id);
		});

		test('always creates a STUDENT, even if the request asks for ADMIN', async () => {
			const res = await register({ ...signup(), role: 'ADMIN' });
			expect(res.status).toBe(201);
			expect(res.body.user.role).toBe('STUDENT');
			expect(res.body.user.passwordHash).toBeUndefined();
			expect(res.body.accessToken).toEqual(expect.any(String));
		});

		test('rejects short passwords, unknown universities and duplicate emails', async () => {
			expect((await register(signup({ password: 'short' }))).status).toBe(400);
			expect((await register(signup({ universityId: 'nope' }))).status).toBe(400);
			const body = signup();
			expect((await register(body)).status).toBe(201);
			expect((await register(body)).status).toBe(409);
		});
	});

	describe('login', () => {
		test('succeeds and sets an httpOnly refresh cookie', async () => {
			const user = await createUser(uni);
			const res = await login(user.email);
			expect(res.status).toBe(200);
			expect(res.body.accessToken).toEqual(expect.any(String));
			expect(res.headers['set-cookie'].find((cookie) => cookie.startsWith('refreshToken='))).toMatch(/HttpOnly/i);
		});

		test('gives the same error for a wrong password and an unknown email', async () => {
			const user = await createUser(uni);
			const wrongPassword = await login(user.email, 'not-the-password');
			const unknownEmail = await login(`nobody-${uid()}@test.dev`);
			expect(wrongPassword.status).toBe(401);
			expect(unknownEmail.status).toBe(401);
			expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
		});
	});

	describe('sessions', () => {
		test('refresh tokens rotate and cannot be reused', async () => {
			const user = await createUser(uni);
			const cookie = refreshCookie(await login(user.email));

			const first = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
			expect(first.status).toBe(200);
			expect(first.body.accessToken).toEqual(expect.any(String));

			const replay = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
			expect(replay.status).toBe(401);
		});

		test('logout revokes the refresh token', async () => {
			const user = await createUser(uni);
			const cookie = refreshCookie(await login(user.email));
			expect((await request(app).post('/api/auth/logout').set('Cookie', cookie)).status).toBe(204);
			expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
		});
	});

	describe('access tokens', () => {
		test('protected routes reject missing, malformed and forged tokens', async () => {
			const user = await createUser(uni);
			expect((await client().get('/auth/me')).status).toBe(401);
			expect((await client('garbage').get('/auth/me')).status).toBe(401);
			const forged = jwt.sign({ sub: user.id, role: 'ADMIN' }, 'some-other-secret');
			expect((await client(forged).get('/auth/me')).status).toBe(401);
			expect((await client(user.token).get('/auth/me')).status).toBe(200);
		});

		test('a deactivated user is locked out immediately, even with a valid token', async () => {
			const user = await createUser(uni);
			expect((await client(user.token).get('/auth/me')).status).toBe(200);
			await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
			expect((await client(user.token).get('/auth/me')).status).toBe(401);
		});

		test('role changes apply immediately, not when the token expires', async () => {
			const user = await createUser(uni, 'STUDENT');
			expect((await client(user.token).get('/admin/stats')).status).toBe(403);
			await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
			expect((await client(user.token).get('/admin/stats')).status).toBe(200);
		});
	});
});
