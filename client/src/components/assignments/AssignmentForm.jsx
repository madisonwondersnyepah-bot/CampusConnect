import { useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function AssignmentForm({ courseId, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', dueAt: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/courses/${courseId}/assignments`, {
        title: form.title,
        description: form.description || null,
        dueAt: new Date(form.dueAt).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="New assignment" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label>Due date and time</label>
          <input type="datetime-local" required value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <Button type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post assignment'}</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}