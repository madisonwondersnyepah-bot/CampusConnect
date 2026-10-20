import { useState } from 'react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import Loader from '../components/ui/Loader';
import AssignmentCard from '../components/assignments/AssignmentCard';

export default function Assignments() {
  const { user } = useAuth();
  const isStudent = ['STUDENT', 'REP'].includes(user.role);
  const canManage = ['LECTURER', 'ADMIN'].includes(user.role);
  const [status, setStatus] = useState('');
  const [upcoming, setUpcoming] = useState(true);

  const { data: assignments, loading, error, reload } = useFetch(
    () => api.get('/assignments', {
      params: { status: status || undefined, upcoming: upcoming || undefined },
    }).then((r) => r.data.assignments),
    [status, upcoming]
  );

  return (
    <>
      <h1>Assignments</h1>
      {!canManage && <p className="muted">Open a course to see all of its assignments. Reminders appear on your dashboard.</p>}
      <div className="toolbar">
        {isStudent && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
        )}
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={upcoming} onChange={(e) => setUpcoming(e.target.checked)} />
          Upcoming only
        </label>
      </div>

      {loading ? <Loader /> : error ? <p className="error">{error}</p> : assignments.length === 0 ? (
        <p className="muted">No assignments match.</p>
      ) : assignments.map((a) => (
        <AssignmentCard key={a.id} assignment={a} role={user.role} canManage={canManage} onChanged={reload} />
      ))}
    </>
  );
}