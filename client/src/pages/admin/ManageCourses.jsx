import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/axios';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';

export default function ManageCourses() {
  const [form, setForm] = useState({ code: '', title: '', semester: '2026-A', lecturerId: '' });
  const [msg, setMsg] = useState(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const [c, l] = await Promise.all([
      api.get('/courses'),
      api.get('/admin/users', { params: { role: 'LECTURER', active: true, limit: 100 } }),
    ]);
    return { courses: c.data.courses, lecturers: l.data.users };
  }, []);

  async function act(fn, okText) {
    setMsg(null);
    try {
      await fn();
      setMsg({ type: 'success', text: okText });
      reload();
      return true;
    } catch (err) {
      setMsg({ type: 'error', text: errorMessage(err) });
      return false;
    }
  }

  async function create(e) {
    e.preventDefault();
    const ok = await act(
      () => api.post('/courses', { ...form, lecturerId: form.lecturerId || null }),
      'Course created.'
    );
    if (ok) setForm({ ...form, code: '', title: '' });
  }

  const assign = (c, lecturerId) =>
    act(() => api.patch(`/courses/${c.id}`, { lecturerId: lecturerId || null }), 'Lecturer updated.');
  const remove = (c) =>
    window.confirm(`Delete ${c.code}? This also removes its enrollments, timetable and assignments.`) &&
    act(() => api.delete(`/courses/${c.id}`), 'Course deleted.');

  if (loading) return <Loader />;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Manage courses</h1>
      {msg && <p className={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</p>}

      <Card title="New course">
        <form onSubmit={create} className="toolbar">
          <input required placeholder="Code (e.g. CS101)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input required placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
          <select value={form.lecturerId} onChange={(e) => setForm({ ...form, lecturerId: e.target.value })}>
            <option value="">No lecturer yet</option>
            {data.lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <Button type="submit">Create</Button>
        </form>
      </Card>

      <Card title={`All courses (${data.courses.length})`}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Title</th><th>Semester</th><th>Lecturer</th><th>Students</th><th /></tr></thead>
            <tbody>
              {data.courses.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/courses/${c.id}`}><strong>{c.code}</strong></Link></td>
                  <td>{c.title}</td>
                  <td>{c.semester}</td>
                  <td>
                    <select value={c.lecturerId ?? ''} onChange={(e) => assign(c, e.target.value)}>
                      <option value="">Not assigned</option>
                      {data.lecturers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </td>
                  <td>{c.enrolledCount}</td>
                  <td><Button variant="ghost" size="sm" onClick={() => remove(c)}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}