const { z } = require('zod');

const createCourseSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(20),
  title: z.string().trim().min(2).max(120),
  semester: z.string().trim().min(2).max(20), // e.g. "2026-A"
  lecturerId: z.string().min(1).nullable().optional(),
});

const updateCourseSchema = createCourseSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const listQuerySchema = z.object({
  mine: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(60).optional(),
});

module.exports = { createCourseSchema, updateCourseSchema, listQuerySchema };