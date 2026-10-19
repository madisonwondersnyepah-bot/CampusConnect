const { z } = require('zod');

const ROLES = ['STUDENT', 'REP', 'LECTURER', 'ADMIN'];

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password,
  role: z.enum(ROLES),
  studentNumber: z.string().trim().min(1).max(30).optional(),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    role: z.enum(ROLES),
    isActive: z.boolean(),
    studentNumber: z.string().trim().min(1).max(30).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const resetPasswordSchema = z.object({ newPassword: password });

const num = z.string().regex(/^\d+$/, 'Must be a number');
const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(60).optional(),
  page: num.optional(),
  limit: num.optional(),
});

module.exports = { createUserSchema, updateUserSchema, resetPasswordSchema, listUsersQuerySchema };