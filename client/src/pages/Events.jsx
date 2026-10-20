import { useState } from 'react';
import api, { errorMessage } from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import Modal from '../components/ui/Modal';
import EventCalendar from '../components/events/EventCalendar';

export default function Events() {
  const { user } = useAuth();
  const [past, setPast] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const canPost = ['ADMIN', 'REP', 'LECTURER'].includes(user.role);
  const canDelete = (e) => user.role === 'ADMIN' || (canPost && e.createdById === user.id);

  const { data: events, loading, error, reload } = useFetch(
    () => api.get('/events', { params: { past: past || undefined } }).then((r) => r.data.events),
    [past]
  );

  async function remove(e) {
    if (!window.confirm(`Delete "${e.title}"?`)) return;
    try {
      await api.delete(`/events/${e.id}`);
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  }

  return (
    <>
      <h1>Campus events</h1>
      <div className="toolbar">
        <div className="tabs" style={{ margin: 0, borderBottom: 0 }}>
          <button className={`tab${!past ? ' active' : ''}`} onClick={() => setPast(false)}>Upcoming</button>
          <button className={`tab${past ? ' active' : ''}`} onClick={() => setPast(true)}>Past</button>
        </div>
        {canPost && <Button onClick={() => setCreating(true)}>New event</Button>}
      </div>
      {msg && <p className="error">{msg}</p>}

      <Card>
        {loading ? <Loader /> : error ? <p className="error">{error}</p> : (
          <EventCalendar events={events} canDelete={canDelete} onDelete={remove} />
        )}
      </Card>

      {creating && <EventForm onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />}
    </>
  );
}

function EventForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', startsAt: '', endsAt: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/events', {
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New event" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field"><label>Title</label><input required value={form.title} onChange={set('title')} /></div>
        <div className="field"><label>Location (optional)</label><input value={form.location} onChange={set('location')} /></div>
        <div className="field"><label>Starts</label><input type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} /></div>
        <div className="field"><label>Ends (optional)</label><input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} /></div>
        <div className="field"><label>Description (optional)</label><textarea value={form.description} onChange={set('description')} /></div>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create event'}</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}