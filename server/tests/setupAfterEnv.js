const prisma = require('../src/config/db');
const { resetDb } = require('./helpers');

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());
