const request = require('supertest');
const app = require('../src/app');

test('login is rate limited after 20 attempts', async () => {
  let last;
  for (let attempt = 0; attempt < 21; attempt++) {
    last = await request(app)
      .post('/api/auth/login')
      .send({ email: 'someone@test.dev', password: 'wrong-password' });
  }
  expect(last.status).toBe(429);
});
