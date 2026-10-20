import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import Modal from '../components/ui/Modal';
import GroupCard from '../components/groups/GroupCard';

export default function StudyGroups() {
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: groups, loading, error, reload } = useFetch(
    () => api.get('/study-groups', { params: { search: search || undefined, mine: mine || undefined } }).then((r) => r.data.groups),
    [search, mine]
  );

  async function join(g) {
    setMsg('');
    try {
      await api.post(`/study-groups/${g.id}/join`);
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  }

  return (
    <>
      <h1>Study groups</h1>
      <div className="toolbar">
        <input type="search" placeholder="Search groups…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          My groups
        </label>
        <Button onClick={() => setCreating(true)}>New group</Button>
      </div>
      {msg && <p className="error">{msg}</p>}

      {loading ? <Loader /> : error ? <p className="error">{error}</p> : groups.length === 0 ? (
        <p className="muted">No groups found. Start one!</p>
      ) : (
        <div className="grid-2">{groups.map((g) => <GroupCard key={g.id} group={g} onJoin={join} />)}</div>
      )}

      {creating && <GroupForm onClose={() => setCreating(false)} />}
    </>
  );
}

function GroupForm({ onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: courses } = useFetch(
    () => api.get('/courses', { params: user.role === 'ADMIN' ? {} : { mine: true } }).then((r) => r.data.courses),
    []
  );
  const [form, setForm] = useState({ name: '', description: '', courseId: '', isPrivate: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/study-groups', {
        name: form.name,
        description: form.description || null,
        courseId: form.courseId || null,
        isPrivate: form.isPrivate,
      });
      navigate(`/groups/${data.group.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New study group" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field"><label>Name</label>
          <input required minLength={3} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>Description (optional)</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="field"><label>Course (optional)</label>
          <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">No specific course</option>
            {(courses || []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
          </select></div>
        <label className="check">
          <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} />
          Private (invite only)
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create group'}</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}