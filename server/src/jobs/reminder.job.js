const cron = require('node-cron');
const { processDueReminders } = require('../services/reminder.service');

let running = false;

function startReminderJob() {
  cron.schedule('* * * * *', async () => {
    if (running) return; // skip if the previous run is still going
    running = true;
    try {
      const n = await processDueReminders();
      if (n > 0) console.log(`[reminders] triggered ${n}`);
    } catch (err) {
      console.error('[reminders] job failed', err);
    } finally {
      running = false;
    }
  });
  console.log('Reminder job scheduled (every minute)');
}

module.exports = { startReminderJob };