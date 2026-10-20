import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/axios';
import Button from '../ui/Button';
import { formatDateTime, timeUntil } from '../../utils/formatDate';

const STATUS = { TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' };
const HOURS = [1, 6, 24, 48, 72];

export default function AssignmentCard({ assignment: a, role, canManage, onChanged }) {
  const isStudent = ['STUDENT', 'REP'].includes(role);
  const [hours, setHours] = useState(24);
  const [note, setNote] = useState(null);
  const [progress, setProgress] = useState(null);
  const [open, setOpen] = useState(false);
  const overdue = new Date(a.dueAt) < new Date();

  async function run(fn, okText) {
    setNote(null);
    try {
      await fn();
      if (okText) setNote({ type: 'success', text: okText });
      return true;
    } catch (err) {
      setNote({ type: 'error', text: errorMessage(err) });
      return false;
    }
  }

  const changeStatus = async (status) => {
    if (await run(() => api.put(`/assignments/${a.id}/progress`, { status }))) onChanged();
  };
  const remind = () => run(() => api.post(`/assignments/${a.id}/reminders`, { hoursBefore: Number(hours) }), 'Reminder set');
  const remove = async () => {
    if (window.confirm(`Delete "${a.title}"?`) && (await run(() => api.delete(`/assignments/${a.id}`)))) onChanged();
  };

  async function toggleProgress() {
    if (!open) {
      try {
        setProgress((await api.get(`/assignments/${a.id}/progress`)).data);
      } catch (err) {
        setNote({ type: 'error', text: errorMessage(err) });
        return;
      }
    }
    setOpen(!open);
  }

  return (
    <div className="card">
      <div className="row between">
        <h3>{a.title}</h3>
        <span className={`badge ${overdue ? 'badge-danger' : ''}`}>{timeUntil(a.dueAt)}</span>
      </div>
      <p className="muted small">
        <Link to={`/courses/${a.course.id}`}>{a.course.code}</Link> · {a.course.title} · due {formatDateTime(a.dueAt)}
      </p>
      {a.description && <p className="post-body">{a.description}</p>}

      {isStudent && (
        <div className="row">
          <select value={a.myStatus} onChange={(e) => changeStatus(e.target.value)} aria-label="Status">
            {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {a.myStatus !== 'DONE' && !overdue && (
            <>
              <select value={hours} onChange={(e) => setHours(e.target.value)} aria-label="Reminder time">
                {HOURS.map((h) => <option key={h} value={h}>{h} h before</option>)}
              </select>
              <Button variant="secondary" size="sm" onClick={remind}>Remind me</Button>
            </>
          )}
        </div>
      )}

      {canManage && (
        <div className="row">
          <Button variant="secondary" size="sm" onClick={toggleProgress}>{open ? 'Hide progress' : 'Class progress'}</Button>
          <Button variant="danger" size="sm" onClick={remove}>Delete</Button>
        </div>
      )}

      {note && <p className={note.type === 'error' ? 'error' : 'success'}>{note.text}</p>}

      {open && progress && (
        <div style={{ marginTop: '0.75rem' }}>
          <p className="small">
            {progress.total} students · To do: <strong>{progress.summary.TODO}</strong> · In progress:{' '}
            <strong>{progress.summary.IN_PROGRESS}</strong> · Done: <strong>{progress.summary.DONE}</strong>
          </p>
          <div className="table-wrap">
            <table>
              <tbody>
                {progress.students.map((s) => (
                  <tr key={s.id}><td>{s.name}</td><td>{STATUS[s.status]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}