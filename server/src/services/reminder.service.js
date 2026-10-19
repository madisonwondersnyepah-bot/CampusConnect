const prisma = require('../config/db');

// Hook for real delivery. Right now "delivered" means: sent=true, so it shows up in
// GET /api/reminders?status=triggered. To add email later, send it here
// (e.g. with Nodemailer or Resend) using reminder.user.email.
async function deliver(reminder) {
  console.log(
    `[reminders] ${reminder.user.email}: "${reminder.assignment.title}" is due ${reminder.assignment.dueAt.toISOString()}`
  );
}

async function processDueReminders(now = new Date()) {
  const due = await prisma.reminder.findMany({
    where: { sent: false, remindAt: { lte: now } },
    include: {
      user: { select: { email: true, name: true } },
      assignment: { select: { title: true, dueAt: true } },
    },
    orderBy: { remindAt: 'asc' },
    take: 200,
  });

  let triggered = 0;
  for (const reminder of due) {
    // Claim it first: only one run can flip sent from false to true, so a reminder
    // is never delivered twice even if the job overlaps or two servers are running.
    const { count } = await prisma.reminder.updateMany({
      where: { id: reminder.id, sent: false },
      data: { sent: true },
    });
    if (count !== 1) continue;

    try {
      await deliver(reminder);
    } catch (err) {
      console.error('[reminders] delivery failed for', reminder.id, err);
    }
    triggered++;
  }
  return triggered;
}

module.exports = { processDueReminders };