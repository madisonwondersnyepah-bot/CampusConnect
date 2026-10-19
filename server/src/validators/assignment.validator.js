const { z } = require('zod');

const base = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(5000).nullable().optional(),
  dueAt: z.coerce.date(),
});

const createAssignmentSchema = base.refine((d) => d.dueAt > new Date(), {
  message: 'dueAt must be in the future',
  path: ['dueAt'],
});

const updateAssignmentSchema = base
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const setProgressSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

const createReminderSchema = z.object({
  hoursBefore: z.number().int().min(1).max(720), // up to 30 days before
});

const listMineQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
});

const listRemindersQuerySchema = z.object({
  status: z.enum(['upcoming', 'triggered']).optional(),
});

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema,
  setProgressSchema,
  createReminderSchema,
  listMineQuerySchema,
  listRemindersQuerySchema,
};