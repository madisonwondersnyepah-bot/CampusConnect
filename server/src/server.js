const app = require('./app');
const env = require('./config/env');
const { startReminderJob } = require('./jobs/reminder.job');

app.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
  startReminderJob();
});