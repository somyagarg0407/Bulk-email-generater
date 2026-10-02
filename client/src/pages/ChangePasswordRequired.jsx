import { useState } from 'react';
import { Alert, Button, Field, Input } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../services/api.js';
import { errMsg } from '../utils/format.js';

/** Shown instead of the app while user.mustChangePassword is true. The server enforces this too. */
export default function ChangePasswordRequired() {
  const { user, logout, refresh } = useAuth();
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) { setError(new Error('The new passwords do not match.')); return; }
    setBusy(true); setError(null);
    try { await api.auth.changePassword(cur, next); toast.success('Password changed.'); await refresh(); }
    catch (err) { setError(err); setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Change your password</h1>
        <Alert tone="warn">Your password must be changed before you continue.</Alert>
        <p className="text-sm text-slate-600">Signed in as {user.email}. Enter the temporary password you were given, then choose a new one.</p>
        <Field label="Temporary (current) password"><Input type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
        <Field label="New password" hint="At least 10 characters, different from the temporary one."><Input type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="Confirm new password"><Input type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {error && <Alert tone="error">{errMsg(error)}</Alert>}
        <div className="flex items-center justify-between gap-3">
          <Button type="submit" loading={busy}>{busy ? 'Saving…' : 'Change password'}</Button>
          <Button variant="ghost" onClick={logout} disabled={busy}>Log out</Button>
        </div>
      </form>
    </div>
  );
}
