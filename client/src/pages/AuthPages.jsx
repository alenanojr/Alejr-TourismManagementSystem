import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, Eye, MailCheck, MessageSquareHeart, Smile } from 'lucide-react';
import { isStaff, useAuth } from '../auth.jsx';
import { auth } from '../data.js';
import { Logo } from '../components/Navbar.jsx';
import { ErrorNote } from '../components/ui.jsx';

// View-only admin account for portfolio visitors (role "viewer": it can't change anything).
const DEMO = { email: 'viewer@example.com', password: 'Demo-8c2df1-2026' };

const PERKS = [
  { icon: CalendarCheck, text: 'Book trips to tourist spots across the Philippines' },
  { icon: MessageSquareHeart, text: 'Rate the places you actually visited' },
  { icon: Smile, text: 'See how other visitors really felt before you go' },
];

function AuthForm({ mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const isRegister = mode === 'register';

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = isRegister ? await register(form) : await login(form.email, form.password);
      // Supabase answers sign-up for an existing email with a fake user and sends nothing.
      if (isRegister && result.user?.identities?.length === 0) {
        setError('This email already has an account. Log in instead.');
        return;
      }
      // With "Confirm email" on, sign-up returns no session until the link is clicked.
      if (isRegister && !result.session) {
        setCheckEmail(true);
        return;
      }
      const profile = await auth.profile(result.user.id).catch(() => null);
      navigate(location.state?.from || (isStaff(profile) ? '/admin/feedback' : '/dashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <main className="auth-page page">
      <div className="auth-art">
        <div className="auth-art-content">
          <Logo light />
          <h2>Your next island adventure starts here.</h2>
          <ul className="auth-perks">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text}><span><Icon size={18} /></span>{text}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="auth-panel">
        {/* Phones/tablets: the photo banner, with the page title sitting on it. Desktop: just the title. */}
        <div className="auth-top">
          {!checkEmail && (
            <div className="auth-head">
              <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
              <p className="muted">{isRegister ? 'Join in a minute. No credit card needed.' : 'Log in to manage your trips and feedback.'}</p>
            </div>
          )}
        </div>
        {checkEmail ? (
          <div className="auth-card center">
            <span className="empty-icon"><MailCheck size={26} /></span>
            <h1>Check your email</h1>
            <p className="muted">We sent a confirmation link to <strong>{form.email}</strong>. Click it, then log in.</p>
            <Link to="/login" className="btn btn-primary btn-block">Go to log in</Link>
          </div>
        ) : (
          <form className="auth-card" onSubmit={onSubmit}>
            {isRegister && (
              <label><span className="label-text">Full name</span><input required autoComplete="name" placeholder="Juan Dela Cruz" {...field('name')} /></label>
            )}
            <label><span className="label-text">Email</span><input type="email" required autoComplete="email" placeholder="you@example.com" {...field('email')} /></label>
            <label>
              <span className="label-text">Password</span>
              <input type="password" required minLength={isRegister ? 8 : undefined} placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'} {...field('password')} />
            </label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </button>
            <p className="muted center">
              {isRegister ? <>Already have an account? <Link to="/login">Log in</Link></>
                : <>New here? <Link to="/register">Create an account</Link></>}
            </p>
            {!isRegister && (
              <div className="alert alert-info demo-login">
                <Eye size={18} />
                <div>
                  <strong>Try the admin demo (view only)</strong>
                  <dl>
                    <dt>Email</dt><dd>{DEMO.email}</dd>
                    <dt>Password</dt><dd>{DEMO.password}</dd>
                  </dl>
                  <button type="button" className="link-btn" onClick={() => setForm({ ...form, ...DEMO })}>Fill in for me</button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
