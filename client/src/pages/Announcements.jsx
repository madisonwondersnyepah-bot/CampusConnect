import { useState } from 'react';
import api, { errorMessage } from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import Modal from '../components/ui/Modal';
import AnnouncementList from '../components/announcements/AnnouncementList';

export default function Announcements() {
  const { user } = useAuth();
  const [scope, setScope] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const canPost = ['ADMIN', 'REP', 'LECTURER'].includes(user.role);
  const canPin = ['ADMIN', 'LECTURER'].includes(user.role);
  const canManage = (a) =>
    user.role === 'ADMIN' || a.authorId === user.id || (user.role === 'LECTURER' && a.course?.lecturerId === user.id);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/announcements', { params: { scope: scope || undefined, page, limit: 10 } }).then((r) => r.data),
    [scope, page]
  );

  async function act(fn) {
    setMsg('');
    try {
      await fn();
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  }
  const remove = (a) => window.confirm('Delete this announcement?') && act(() => api.delete(`/announcements/${a.id}`));
  const togglePin = (a) => act(() => api.patch(`/announcements/${a.id}`, { pinned: !a.pinned }));

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <h1>Announcements</h1>
      <div className="toolbar">
        <select value={scope} onChange={(e) => { setScope(e.target.value); setPage(1); }}>
          <option value="">All announcements</option>
          <option value="campus">Campus-wide</option>
          <option value="courses">My courses</option>
        </select>
        {canPost && <Button onClick={() => setCreating(true)}>New announcement</Button>}
      </div>
      {msg && <p className="error">{msg}</p>}

      <Card>
        {loading ? <Loader /> : error ? <p className="error">{error}</p> : (
          <>
            <AnnouncementList items={data.announcements} canManage={canManage} canPin={canPin}
              onDelete={remove} onTogglePin={togglePin} />
            {pages > 1 && (
              <div className="row between" style={{ marginTop: '1rem' }}>
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="muted small">Page {page} of {pages}</span>
                <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </Card>

      {creating && (
        <AnnouncementForm user={user} canPin={canPin} onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setPage(1); reload(); }} />
      )}
    </>
  );
}

function AnnouncementForm({ user, canPin, onClose, onCreated }) {
  const canCampus = ['ADMIN', 'REP'].includes(user.role);
  const { data: courses } = useFetch(
    () => api.get('/courses', { params: user.role === 'ADMIN' ? {} : { mine: true } }).then((r) => r.data.courses),
    []
  );
  const [form, setForm] = useState({ title: '', body: '', target: canCampus ? 'campus' : '', pinned: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/announcements', {
        title: form.title,
        body: form.body,
        pinned: form.pinned,
        courseId: form.target === 'campus' ? null : form.target,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New announcement" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Audience</label>
          <select required value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
            {!canCampus && <option value="">Choose a course…</option>}
            {canCampus && <option value="campus">Campus-wide</option>}
            {(courses || []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Message</label>
          <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        {canPin && (
          <label className="check">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Pin to the top
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <div className="row">
          <Button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post'}</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}