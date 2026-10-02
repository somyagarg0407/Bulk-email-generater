import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Input } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../utils/format.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={loc.state?.from || '/dashboard'} replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await login(email, password); navigate(loc.state?.from || '/dashboard', { replace: true }); }
    catch (err) { setError(err); setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-nitd-600 text-sm font-bold text-white" aria-hidden="true">NITD</div>
          <div className="leading-tight"><p className="text-lg font-semibold">NIT Delhi Club Mail</p><p className="text-sm text-slate-500">Student Recipient Manager</p></div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <Field label="Email"><Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <Alert tone="error">{errMsg(error)}</Alert>}
          <Button type="submit" className="w-full" loading={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          <p className="text-center text-xs text-slate-500">Access is by invitation from your club admin. There is no public registration.</p>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">This tool generates recipient lists only. It does not send email.</p>
      </div>
    </div>
  );
}
