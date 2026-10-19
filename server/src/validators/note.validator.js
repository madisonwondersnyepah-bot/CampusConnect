const { z } = require('zod');

const fields = {
  title: z.string().trim().min(1).max(150),
  content: z.string().max(50000),
};

const createNoteSchema = z.object({
  ...fields,
  courseId: z.string().min(1).nullable().optional(),
});

const createGroupNoteSchema = z.object(fields); // group notes inherit the group's course

const updateNoteSchema = z
  .object(fields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const listNotesQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  search: z.string().trim().max(60).optional(),
});

module.exports = { createNoteSchema, createGroupNoteSchema, updateNoteSchema, listNotesQuerySchema };