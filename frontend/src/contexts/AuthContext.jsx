import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem('access_token'),
  );

  const claims = useMemo(
    () => (accessToken ? decodeJwt(accessToken) : {}),
    [accessToken],
  );

  const isAuthenticated = Boolean(accessToken);
  const role     = claims.role     ?? null;
  const isFarmer = role === 'farmer';
  const isAdmin  = role === 'admin';

  const login = useCallback((tokens) => {
    localStorage.setItem('access_token',  tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    setAccessToken(tokens.access);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, isFarmer, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
