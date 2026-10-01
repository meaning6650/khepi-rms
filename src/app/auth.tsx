import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { firebase, missingConfig } from '../data/firebase';
import { loadAccess, roleOf, type AccessDoc, type Role } from '../data/access';

type AuthState = {
  status: 'config-missing' | 'loading' | 'signed-out' | 'no-access' | 'ready' | 'error';
  user: User | null;
  role: Role | null;
  access: AccessDoc | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AccessDoc | null>(null);
  const [status, setStatus] = useState<AuthState['status']>(missingConfig.length ? 'config-missing' : 'loading');
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) { setAccess(null); setStatus('signed-out'); return; }
    setStatus('loading');
    try {
      const a = await loadAccess();
      setAccess(a);
      setStatus(roleOf(a, u.email) ? 'ready' : 'no-access');
    } catch (e) {
      setError(`권한 확인 실패 / ${(e as Error).message}`);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (missingConfig.length) return;
    return onAuthStateChanged(firebase().auth, (u) => { void resolve(u); });
  }, [resolve]);

  const value: AuthState = {
    status, user, access, error,
    role: roleOf(access, user?.email),
    signIn: async () => {
      setError(null);
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(firebase().auth, provider);
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        setError(code === 'auth/unauthorized-domain'
          ? '승인되지 않은 도메인 / Firebase 콘솔 Authentication 승인된 도메인 추가 필요'
          : `로그인 실패 / ${code ?? (e as Error).message}`);
      }
    },
    signOut: () => signOut(firebase().auth),
    refreshAccess: () => resolve(firebase().auth.currentUser),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider 필요');
  return v;
}
