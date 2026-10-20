import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';

export default function Courses() {
  const { user } = useAuth();
  const canEnroll = ['STUDENT', 'REP'].includes(user.role);
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [mine, setMine] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: courses, loading, error, reload } = useFetch(
    () => api.get('/courses', { params: { search: search || undefined, mine: mine || undefined } }).then((r) => r.data.courses),
    [search, mine]
  );

  async function toggle(course) {
    setMsg('');
    try {
      if (course.isEnrolled) await api.delete(`/courses/${course.id}/enroll`);
      else await api.post(`/courses/${course.id}/enroll`);
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  }

  return (
    <>
      <h1>Courses</h1>
      <div className="toolbar">
        <input type="search" placeholder="Search by code or title…" value={q} onChange={(e) => setQ(e.target.value)} />
        {user.role !== 'ADMIN' && (
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            {user.role === 'LECTURER' ? 'Courses I teach' : 'My courses'}
          </label>
        )}
      </div>
      {msg && <p className="error">{msg}</p>}

      <Card>
        {loading ? <Loader /> : error ? <p className="error">{error}</p> : courses.length === 0 ? (
          <p className="muted">No courses found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Code</th><th>Title</th><th>Semester</th><th>Lecturer</th><th>Students</th>{canEnroll && <th />}</tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/courses/${c.id}`}><strong>{c.code}</strong></Link></td>
                    <td>{c.title}</td>
                    <td>{c.semester}</td>
                    <td>{c.lecturer?.name ?? <span className="muted">Not assigned</span>}</td>
                    <td>{c.enrolledCount}</td>
                    {canEnroll && (
                      <td>
                        <Button size="sm" variant={c.isEnrolled ? 'secondary' : 'primary'} onClick={() => toggle(c)}>
                          {c.isEnrolled ? 'Leave' : 'Enroll'}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}