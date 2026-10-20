import { Link } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import Button from '../components/ui/Button';
import { formatDateTime, timeUntil } from '../utils/formatDate';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(async () => {
    const [a, t, n, e, r] = await Promise.all([
      api.get('/assignments', { params: { upcoming: true } }),
      api.get('/timetable'),
      api.get('/announcements', { params: { limit: 4 } }),
      api.get('/events'),
      api.get('/reminders', { params: { status: 'triggered' } }),
    ]);
    return {
      assignments: a.data.assignments,
      week: t.data.week,
      announcements: n.data.announcements,
      events: e.data.events,
      reminders: r.data.reminders,
    };
  }, []);

  if (loading) return <Loader />;
  if (error) return <p className="error">{error}</p>;

  const isStudent = ['STUDENT', 'REP'].includes(user.role);
  const todaySlots = data.week[DAYS[new Date().getDay()]];
  const due = data.assignments.filter((a) => !isStudent || a.myStatus !== 'DONE').slice(0, 5);
  const dismiss = (id) => api.delete(`/reminders/${id}`).then(reload).catch(() => {});

  return (
    <>
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>

      {data.reminders.length > 0 && (
        <Card title="🔔 Reminders" className="highlight">
          {data.reminders.map((r) => (
            <div key={r.id} className="list-item">
              <span>
                <strong>{r.assignment.course.code}</strong> · {r.assignment.title} ({timeUntil(r.assignment.dueAt)})
              </span>
              <Button variant="ghost" size="sm" onClick={() => dismiss(r.id)}>Dismiss</Button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid-2">
        <Card title="Today's classes" actions={<Link to="/timetable">Full timetable</Link>}>
          {todaySlots.length === 0 ? <p className="muted">No classes today.</p> : todaySlots.map((s) => (
            <div key={s.id} className="list-item">
              <span><strong>{s.startTime}–{s.endTime}</strong> {s.course.code} {s.course.title}</span>
              <span className="muted">{s.room}</span>
            </div>
          ))}
        </Card>

        <Card title="Upcoming deadlines" actions={<Link to="/assignments">All assignments</Link>}>
          {due.length === 0 ? <p className="muted">Nothing due. Enjoy the calm.</p> : due.map((a) => (
            <div key={a.id} className="list-item">
              <span><strong>{a.course.code}</strong> {a.title}</span>
              <span className="muted small">{timeUntil(a.dueAt)}</span>
            </div>
          ))}
        </Card>

        <Card title="Latest announcements" actions={<Link to="/announcements">See all</Link>}>
          {data.announcements.length === 0 ? <p className="muted">No announcements yet.</p> : data.announcements.map((a) => (
            <div key={a.id} className="list-item">
              <span>{a.pinned && '📌 '}{a.title}</span>
              <span className="badge">{a.course ? a.course.code : 'Campus'}</span>
            </div>
          ))}
        </Card>

        <Card title="Upcoming events" actions={<Link to="/events">All events</Link>}>
          {data.events.length === 0 ? <p className="muted">No upcoming events.</p> : data.events.slice(0, 4).map((e) => (
            <div key={e.id} className="list-item">
              <span>{e.title}</span>
              <span className="muted small">{formatDateTime(e.startsAt)}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}