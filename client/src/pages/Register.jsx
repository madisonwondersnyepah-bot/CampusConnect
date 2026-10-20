import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import * as authApi from '../api/auth.api';
import { errorMessage } from '../api/axios';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Register() {
  const { user, register } = useAuth();
  const { data: universities } = useFetch(authApi.universities, []);
  const [form, setForm] = useState({ name: '', email: '', password: '', studentNumber: '', universityId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ ...form, studentNumber: form.studentNumber || undefined });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Card title="Create your account" className="auth-card">
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" required value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label htmlFor="university">University</label>
            <select id="university" required value={form.universityId} onChange={set('universityId')}>
              <option value="">Select your university…</option>
              {(universities || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="studentNumber">Student number (optional)</label>
            <input id="studentNumber" value={form.studentNumber} onChange={set('studentNumber')} />
          </div>
          <div className="field">
            <label htmlFor="password">Password (min. 8 characters)</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password"
              value={form.password} onChange={set('password')} />
          </div>
          {error && <p className="error">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
        </form>
        <p className="small muted" style={{ marginTop: '1rem' }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}