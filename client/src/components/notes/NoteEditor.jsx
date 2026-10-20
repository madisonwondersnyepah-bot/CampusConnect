import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

// noteId set  -> open an existing note (edit if allowed, otherwise read-only)
// noteId null -> create a new note (in the group if groupId is set, otherwise personal)
export default function NoteEditor({ noteId, groupId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', content: '' });
  const [canEdit, setCanEdit] = useState(!noteId);
  const [loading, setLoading] = useState(!!noteId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!noteId) return;
    api.get(`/notes/${noteId}`)
      .then(({ data }) => {
        setForm({ title: data.note.title, content: data.note.content });
        setCanEdit(data.canEdit);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [noteId]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (noteId) await api.patch(`/notes/${noteId}`, form);
      else await api.post(groupId ? `/study-groups/${groupId}/notes` : '/notes', form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.delete(`/notes/${noteId}`);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={noteId ? (canEdit ? 'Edit note' : 'Note') : 'New note'} onClose={onClose}>
      {loading ? <p className="muted">Loading…</p> : (
        <form onSubmit={save}>
          <div className="field">
            <label>Title</label>
            <input required disabled={!canEdit} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Content</label>
            <textarea style={{ minHeight: 220 }} disabled={!canEdit} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="row">
            {canEdit && <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>}
            {canEdit && noteId && <Button variant="danger" onClick={remove}>Delete</Button>}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}