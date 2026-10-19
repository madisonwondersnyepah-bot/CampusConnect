const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  courseId: z.string().min(1).nullable().optional(),
  isPrivate: z.boolean().optional(),
});

const updateGroupSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(500).nullable(),
    isPrivate: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const listGroupsQuerySchema = z.object({
  mine: z.enum(['true', 'false']).optional(),
  courseId: z.string().min(1).optional(),
  search: z.string().trim().max(60).optional(),
});

module.exports = { createGroupSchema, updateGroupSchema, addMemberSchema, listGroupsQuerySchema };