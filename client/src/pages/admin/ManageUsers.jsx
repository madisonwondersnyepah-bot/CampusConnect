import { useState } from 'react';
import api, { errorMessage } from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Modal from '../../components/ui/Modal';

const ROLES = ['STUDENT', 'REP', 'LECTURER', 'ADMIN'];

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [q, setQ] = useState('');
  const search = useDebounce(q);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [msg, setMsg] = useState(null);

  const { data, loading, error, reload } = useFetch(
    () => api.get('/admin/users', {
      params: { role: role || undefined, active: active || undefined, search: search || undefined, page },
    }).then((r) => r.data),
    [role, active, search, page]
  );

  async function update(u, patch) {
    setMsg(null);
    try {
      const { data: res } = await api.patch(`/admin/users/${u.id}`, patch);
      setMsg({
        type: 'success',
        text: res.coursesUnassigned ? `Updated. ${res.coursesUnassigned} course(s) were unassigned.` : 'Updated.',
      });
      reload();
    } catch (err) {
      setMsg({ type: 'error', text: errorMessage(err) });
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <h1>Users</h1>
      <div className="toolbar">
        <input type="search" placeholder="Search name, email, student no…" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
          <option value="">Active and inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <Button onClick={() => setCreating(true)}>New user</Button>
      </div>
      {msg && <p className={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</p>}

      <Card>
        {loading ? <Loader /> : error ? <p className="error">{error}</p> : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Student no.</th><th>Role</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.users.map((u) => {
                    const isMe = u.id === me.id;
                    return (
                      <tr key={u.id}>
                        <td>{u.name}{isMe && <span className="muted"> (you)</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.studentNumber ?? '—'}</td>
                        <td>
                          <select value={u.role} disabled={isMe} onChange={(e) => update(u, { role: e.target.value })}>
                            {ROLES.map((r) => <option key={r}>{r}</option>)}
                          </select>
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="row">
                            <Button size="sm" variant="secondary" disabled={isMe}
                              onClick={() => update(u, { isActive: !u.isActive })}>
                              {u.isActive ? 'Deactivate' : 'Reactivate'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setResetting(u)}>Reset password</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="row between" style={{ marginTop: '1rem' }}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="muted small">Page {page} of {pages} · {data.total} users</span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </>
        )}
      </Card>

      {creating && (
        <CreateUserModal onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setMsg({ type: 'success', text: 'User created.' }); reload(); }} />
      )}
      {resetting && (
        <ResetPasswordModal user={resetting} onClose={() => setResetting(null)}
          onDone={() => { setResetting(null); setMsg({ type: 'success', text: 'Password reset. The user was signed out everywhere.' }); }} />
      )}
    </>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'LECTURER', studentNumber: '' });
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/users', { ...form, studentNumber: form.studentNumber || undefined });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title="New user" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field"><label>Full name</label><input required value={form.name} onChange={set('name')} /></div>
        <div className="field"><label>Email</label><input type="email" required value={form.email} onChange={set('email')} /></div>
        <div className="field"><label>Role</label>
          <select value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="field"><label>Student number (optional)</label><input value={form.studentNumber} onChange={set('studentNumber')} /></div>
        <div className="field"><label>Temporary password (min. 8 characters)</label>
          <input type="password" required minLength={8} value={form.password} onChange={set('password')} /></div>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <Button type="submit">Create user</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, { newPassword: password });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={`Reset password for ${user.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field"><label>New password (min. 8 characters)</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <Button type="submit">Reset password</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}