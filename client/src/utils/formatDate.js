const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (d) => dateFmt.format(new Date(d));
export const formatTime = (d) => timeFmt.format(new Date(d));
export const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;

export function timeUntil(d) {
  const diff = new Date(d).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const text = mins < 60 ? `${mins} min` : hours < 48 ? `${hours} h` : `${days} days`;
  return diff < 0 ? `overdue by ${text}` : `due in ${text}`;
}