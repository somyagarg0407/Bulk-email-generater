import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../services/api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.auth.me().then((r) => setUser(r.data)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    const onPwd = () => setUser((u) => (u ? { ...u, mustChangePassword: true } : u));
    window.addEventListener('auth:expired', onExpired);
    window.addEventListener('auth:password-required', onPwd);
    return () => { window.removeEventListener('auth:expired', onExpired); window.removeEventListener('auth:password-required', onPwd); };
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.auth.login(email, password);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  const refresh = useCallback(async () => setUser((await api.auth.me()).data), []);

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
