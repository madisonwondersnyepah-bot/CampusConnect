import { useState } from 'react';
import api from '../api/axios';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import NoteEditor from '../components/notes/NoteEditor';
import { formatDateTime } from '../utils/formatDate';

export default function Notes() {
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [editor, setEditor] = useState(null); // { noteId } or {} for a new note

  const { data: notes, loading, error, reload } = useFetch(
    () => api.get('/notes', { params: { search: search || undefined } }).then((r) => r.data.notes),
    [search]
  );

  return (
    <>
      <h1>My notes</h1>
      <p className="muted">Private notes that only you can see.</p>
      <div className="toolbar">
        <input type="search" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setEditor({})}>New note</Button>
      </div>

      {loading ? <Loader /> : error ? <p className="error">{error}</p> : notes.length === 0 ? (
        <p className="muted">No notes yet.</p>
      ) : (
        <div className="grid-2">
          {notes.map((n) => (
            <Card key={n.id} title={n.title}
              actions={<Button size="sm" variant="secondary" onClick={() => setEditor({ noteId: n.id })}>Open</Button>}>
              <p className="muted small">
                {n.course ? `${n.course.code} · ` : ''}updated {formatDateTime(n.updatedAt)}
              </p>
              <p className="post-body">{n.preview}{n.preview.length >= 140 ? '…' : ''}</p>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <NoteEditor noteId={editor.noteId} onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); reload(); }} />
      )}
    </>
  );
}