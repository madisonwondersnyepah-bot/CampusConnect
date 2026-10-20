import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import NoteEditor from '../components/notes/NoteEditor';
import { formatDateTime } from '../utils/formatDate';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const { data: g } = await api.get(`/study-groups/${groupId}`);
    const notes = g.group.myRole ? (await api.get(`/study-groups/${groupId}/notes`)).data.notes : [];
    return { ...g, notes };
  }, [groupId]);

  if (loading) return <Loader />;
  if (error) return <p className="error">{error}</p>;

  const { group, members, notes } = data;
  const isMember = !!group.myRole;
  const isOwner = group.myRole === 'OWNER' || user.role === 'ADMIN';

  async function act(fn, okText, after = reload) {
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ type: 'success', text: okText });
      after();
    } catch (err) {
      setMsg({ type: 'error', text: errorMessage(err) });
    }
  }

  const join = () => act(() => api.post(`/study-groups/${groupId}/join`));
  const leave = () => act(() => api.delete(`/study-groups/${groupId}/members/me`), null, () => navigate('/groups'));
  const deleteGroup = () =>
    window.confirm('Delete this group and all of its notes?') &&
    act(() => api.delete(`/study-groups/${groupId}`), null, () => navigate('/groups'));
  const removeMember = (m) =>
    window.confirm(`Remove ${m.name}?`) && act(() => api.delete(`/study-groups/${groupId}/members/${m.id}`));
  const addMember = (e) => {
    e.preventDefault();
    act(() => api.post(`/study-groups/${groupId}/members`, { email }), 'Member added', () => { setEmail(''); reload(); });
  };

  return (
    <>
      <p><Link to="/groups">← All groups</Link></p>
      <div className="row between">
        <h1>{group.name} {group.isPrivate && <span className="badge">Private</span>}</h1>
        <div className="row">
          {!isMember && !group.isPrivate && <Button onClick={join}>Join group</Button>}
          {isMember && group.myRole !== 'OWNER' && <Button variant="secondary" onClick={leave}>Leave</Button>}
          {isOwner && <Button variant="danger" onClick={deleteGroup}>Delete group</Button>}
        </div>
      </div>
      {group.description && <p>{group.description}</p>}
      <p className="muted small">
        {group.course ? `${group.course.code} · ` : ''}{group.memberCount} members · owner {group.owner.name}
      </p>
      {msg && <p className={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</p>}

      {isMember ? (
        <Card title="Shared notes" actions={<Button size="sm" onClick={() => setEditor({})}>New note</Button>}>
          {notes.length === 0 ? <p className="muted">No notes yet. Share the first one!</p> : notes.map((n) => (
            <div key={n.id} className="list-item">
              <div>
                <strong>{n.title}</strong>
                <div className="muted small">{n.author.name} · {formatDateTime(n.updatedAt)}</div>
                <div className="small">{n.preview}{n.preview.length >= 140 ? '…' : ''}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditor({ noteId: n.id })}>Open</Button>
            </div>
          ))}
        </Card>
      ) : (
        <Card><p className="muted">Join this group to see its members and shared notes.</p></Card>
      )}

      {members && (
        <Card title="Members">
          <div className="table-wrap">
            <table>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td><span className="badge">{m.role === 'OWNER' ? 'Owner' : 'Member'}</span></td>
                    <td className="muted small">joined {formatDateTime(m.joinedAt)}</td>
                    <td>
                      {isOwner && m.role !== 'OWNER' && (
                        <Button variant="ghost" size="sm" onClick={() => removeMember(m)}>Remove</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isOwner && (
            <form onSubmit={addMember} className="toolbar" style={{ marginTop: '1rem' }}>
              <input type="email" required placeholder="Add a member by email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit">Add</Button>
            </form>
          )}
        </Card>
      )}

      {editor && (
        <NoteEditor noteId={editor.noteId} groupId={groupId} onClose={() => setEditor(null)}
          onSaved={() => { setEditor(null); reload(); }} />
      )}
    </>
  );
}