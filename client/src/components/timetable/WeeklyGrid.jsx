import { Link } from 'react-router-dom';

const DAYS = [
  ['MON', 'Monday'], ['TUE', 'Tuesday'], ['WED', 'Wednesday'], ['THU', 'Thursday'],
  ['FRI', 'Friday'], ['SAT', 'Saturday'], ['SUN', 'Sunday'],
];
const JS_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function WeeklyGrid({ week }) {
  const today = JS_DAYS[new Date().getDay()];
  return (
    <div className="week">
      {DAYS.map(([key, label]) => (
        <div key={key} className={`day${key === today ? ' today' : ''}`}>
          <h3>{label}</h3>
          {week[key].length === 0 ? <p className="muted small">No classes</p> : week[key].map((s) => (
            <div key={s.id} className="slot">
              <strong><Link to={`/courses/${s.course.id}`}>{s.course.code}</Link></strong>
              <div>{s.startTime}–{s.endTime}</div>
              <div className="muted">{s.course.title}{s.room ? ` · ${s.room}` : ''}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}