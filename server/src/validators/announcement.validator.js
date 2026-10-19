const { z } = require('zod');

const fields = {
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(1).max(10000),
  pinned: z.boolean(),
};

const createAnnouncementSchema = z.object({
  title: fields.title,
  body: fields.body,
  courseId: z.string().min(1).nullable().optional(), // omitted or null = campus-wide
  pinned: fields.pinned.optional(),
});

const updateAnnouncementSchema = z
  .object(fields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const num = z.string().regex(/^\d+$/, 'Must be a number');
const listAnnouncementsQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  scope: z.enum(['campus', 'courses']).optional(),
  page: num.optional(),
  limit: num.optional(),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema, listAnnouncementsQuerySchema };