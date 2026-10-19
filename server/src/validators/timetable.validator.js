const { z } = require('zod');

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM format, e.g. 08:00');

const slotFields = z.object({
  dayOfWeek: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
  startTime: time,
  endTime: time,
  room: z.string().trim().min(1).max(40).nullable().optional(),
});

const createSlotSchema = slotFields.refine((d) => d.startTime < d.endTime, {
  message: 'endTime must be after startTime',
  path: ['endTime'],
});

const updateSlotSchema = slotFields
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

module.exports = { createSlotSchema, updateSlotSchema };