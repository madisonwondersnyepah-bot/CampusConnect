import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import AssignmentCard from '../components/assignments/AssignmentCard';
import AssignmentForm from '../components/assignments/AssignmentForm';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState('timetable');
  const { data: course, loading, error, reload } = useFetch(
    () => api.get(`/courses/${courseId}`).then((r) => r.data.course),
    [courseId]
  );

  if (loading) return <Loader />;
  if (error) return <p className="error">{error}</p>;

  const isManager = user.role === 'ADMIN' || (user.role === 'LECTURER' && course.lecturerId === user.id);
  const canSeeContent = isManager || course.isEnrolled;

  return (
    <>
      <h1>{course.code} · {course.title}</h1>
      <p className="muted">
        {course.semester} · Lecturer: {course.lecturer?.name ?? 'not assigned'} · {course.enrolledCount} students
      </p>

      <div className="tabs">
        <button className={`tab${tab === 'timetable' ? ' active' : ''}`} onClick={() => setTab('timetable')}>Timetable</button>
        <button className={`tab${tab === 'assignments' ? ' active' : ''}`} onClick={() => setTab('assignments')}>Assignments</button>
        {isManager && (
          <button className={`tab${tab === 'students' ? ' active' : ''}`} onClick={() => setTab('students')}>Students</button>
        )}
      </div>

      {tab === 'timetable' && <SlotsPanel course={course} isManager={isManager} onChanged={reload} />}
      {tab === 'assignments' && <AssignmentsPanel course={course} canSee={canSeeContent} isManager={isManager} />}
      {tab === 'students' && isManager && <RosterPanel courseId={course.id} />}
    </>
  );
}

function SlotsPanel({ course, isManager, onChanged }) {
  const [form, setForm] = useState({ dayOfWeek: 'MON', startTime: '08:00', endTime: '10:00', room: '' });
  const [error, setError] = useState('');

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/courses/${course.id}/slots`, { ...form, room: form.room || null });
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await api.delete(`/courses/${course.id}/slots/${id}`);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const slots = [...course.slots].sort(
    (a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime)
  );

  return (
    <Card title="Weekly schedule">
      {slots.length === 0 ? <p className="muted">No sessions scheduled yet.</p> : slots.map((s) => (
        <div key={s.id} className="list-item">
          <span><strong>{s.dayOfWeek}</strong> {s.startTime}–{s.endTime}{s.room ? ` · ${s.room}` : ''}</span>
          {isManager && <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>Delete</Button>}
        </div>
      ))}

      {isManager && (
        <form onSubmit={add} className="toolbar" style={{ marginTop: '1rem' }}>
          <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
            {DAYS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <input type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <input placeholder="Room (optional)" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <Button type="submit">Add session</Button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </Card>
  );
}

function AssignmentsPanel({ course, canSee, isManager }) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const { data: assignments, loading, error, reload } = useFetch(
    () => (canSee ? api.get(`/courses/${course.id}/assignments`).then((r) => r.data.assignments) : Promise.resolve([])),
    [course.id, canSee]
  );

  if (!canSee) return <Card><p className="muted">Enroll in this course to see its assignments.</p></Card>;
  if (loading) return <Loader />;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      {isManager && (
        <div className="toolbar">
          <Button onClick={() => setCreating(true)}>New assignment</Button>
        </div>
      )}
      {assignments.length === 0 && <p className="muted">No assignments posted yet.</p>}
      {assignments.map((a) => (
        <AssignmentCard key={a.id} assignment={a} role={user.role} canManage={isManager} onChanged={reload} />
      ))}
      {creating && (
        <AssignmentForm courseId={course.id} onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}

function RosterPanel({ courseId }) {
  const [error, setError] = useState('');
  const { data: students, loading, error: loadError, reload } = useFetch(
    () => api.get(`/courses/${courseId}/students`).then((r) => r.data.students),
    [courseId]
  );

  async function remove(s) {
    if (!window.confirm(`Remove ${s.name} from this course?`)) return;
    try {
      await api.delete(`/courses/${courseId}/students/${s.id}`);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <Loader />;
  if (loadError) return <p className="error">{loadError}</p>;

  return (
    <Card title={`Enrolled students (${students.length})`}>
      {error && <p className="error">{error}</p>}
      {students.length === 0 ? <p className="muted">Nobody has enrolled yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Student no.</th><th /></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.studentNumber ?? '—'}</td>
                  <td><Button variant="ghost" size="sm" onClick={() => remove(s)}>Remove</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}