import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { errorMessage } from '../api/axios';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname || '/';
  if (user) return <Navigate to={from} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Card title="🎓 CampusConnect" className="auth-card">
        <p className="muted">Sign in to manage your university life.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="error">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="small muted" style={{ marginTop: '1rem' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}