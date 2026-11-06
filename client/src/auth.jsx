import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { supabase } from './supabase.js';
import { auth } from './data.js';
import { PageLoader } from './components/ui.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let alive = true;
    auth.profile(userId)
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile({ id: userId, name: session.user.email, email: session.user.email, role: 'tourist' }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loading = session === undefined || (Boolean(userId) && !profile);
  const user = userId && profile ? profile : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: auth.signIn,
        register: auth.signUp,
        logout: auth.signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Admins manage everything; viewers see the admin pages but can't change anything.
export const isStaff = (user) => user?.role === 'admin' || user?.role === 'viewer';
export const isViewer = (user) => user?.role === 'viewer';

export function ViewOnlyNotice() {
  const { user } = useAuth();
  if (!isViewer(user)) return null;
  return (
    <p className="alert alert-info"><Eye size={18} /> <span>You're signed in with a <strong>view-only</strong> admin account. You can look around, but changes are turned off.</span></p>
  );
}

// role: one role or a list of roles allowed on the page.
export function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && ![].concat(role).includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
