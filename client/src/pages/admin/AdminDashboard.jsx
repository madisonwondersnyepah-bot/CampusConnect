import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useFetch from '../../hooks/useFetch';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { formatDateTime } from '../../utils/formatDate';

function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
      {hint && <span className="small">{hint}</span>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: s, loading, error } = useFetch(() => api.get('/admin/stats').then((r) => r.data), []);
  if (loading) return <Loader />;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Admin overview</h1>
      <div className="stats">
        <Stat label="Users" value={s.users.total} hint={`${s.users.active} active`} />
        <Stat label="New this week" value={s.users.newThisWeek} />
        <Stat label="Courses" value={s.courses.total} hint={`${s.courses.withoutLecturer} without lecturer`} />
        <Stat label="Enrollments" value={s.courses.enrollments} />
        <Stat label="Assignments" value={s.assignments.total} hint={`${s.assignments.upcoming} upcoming`} />
        <Stat label="Announcements" value={s.content.announcements} />
        <Stat label="Upcoming events" value={s.content.upcomingEvents} />
        <Stat label="Study groups" value={s.content.studyGroups} />
        <Stat label="Notes" value={s.content.notes} />
      </div>

      <div className="grid-2">
        <Card title="Users by role">
          {Object.entries(s.users.byRole).map(([role, count]) => (
            <div key={role} className="list-item"><span>{role}</span><strong>{count}</strong></div>
          ))}
        </Card>
        <Card title="Recently joined" actions={<Link to="/admin/users">Manage users</Link>}>
          {s.recentUsers.map((u) => (
            <div key={u.id} className="list-item">
              <span>{u.name} <span className="badge">{u.role}</span></span>
              <span className="muted small">{formatDateTime(u.createdAt)}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}