const { z } = require('zod');

const base = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
});

const createEventSchema = base
  .refine((d) => d.startsAt > new Date(), { message: 'startsAt must be in the future', path: ['startsAt'] })
  .refine((d) => !d.endsAt || d.endsAt > d.startsAt, { message: 'endsAt must be after startsAt', path: ['endsAt'] });

const updateEventSchema = base
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const isDate = (v) => !Number.isNaN(Date.parse(v));
const listEventsQuerySchema = z.object({
  past: z.enum(['true', 'false']).optional(),
  from: z.string().refine(isDate, 'Invalid date').optional(),
  to: z.string().refine(isDate, 'Invalid date').optional(),
});

module.exports = { createEventSchema, updateEventSchema, listEventsQuerySchema };