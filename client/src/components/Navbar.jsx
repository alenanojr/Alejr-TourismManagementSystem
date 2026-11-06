import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, ClipboardList, Compass, LayoutDashboard, LogOut, Luggage, MapPinned, Menu, MessageSquare, Moon, Sun, X,
} from 'lucide-react';
import { isStaff, isViewer, useAuth } from '../auth.jsx';
import { initials } from './ui.jsx';
import { useTheme } from '../theme.js';
import logoMark from '../assets/logo.webp';

export function Logo({ light = false }) {
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <img className="logo-mark" src={logoMark} alt="" width="32" height="32" />
      <span>Philippine<strong>Tourism</strong></span>
    </span>
  );
}

const EXPLORE = { to: '/', label: 'Explore', icon: Compass, end: true };
const TOURIST_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bookings', label: 'My Bookings', icon: Luggage },
  { to: '/my-feedback', label: 'My Feedback', icon: MessageSquare },
];
const ADMIN_LINKS = [
  { to: '/admin/feedback', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPinned },
  { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
];

function navLinks(user) {
  if (!user) return [EXPLORE];
  return [EXPLORE, ...(isStaff(user) ? ADMIN_LINKS : TOURIST_LINKS)];
}

// Phone-only bottom tabs for signed-in users.
function TabBar({ user }) {
  const tabs = isStaff(user)
    ? [EXPLORE, ADMIN_LINKS[0], { ...ADMIN_LINKS[1], label: 'Spots' }, ADMIN_LINKS[2]]
    : [EXPLORE, { ...TOURIST_LINKS[0], label: 'Home' }, { ...TOURIST_LINKS[1], label: 'Trips' }, { ...TOURIST_LINKS[2], label: 'Feedback' }];
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="tab">
          <Icon size={21} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// Icon button in the bar; on narrow phones it moves into the drawer as a labelled row (`inDrawer`).
function ThemeToggle({ inDrawer = false, tabIndex }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = theme === 'dark' ? Sun : Moon;
  if (inDrawer) {
    return (
      <button type="button" className="drawer-theme" onClick={toggle} tabIndex={tabIndex}>
        <Icon size={19} aria-hidden="true" /> {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    );
  }
  return (
    <button type="button" className="icon-btn theme-toggle" title={label} aria-label={label} onClick={toggle}>
      <Icon size={18} />
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const links = navLinks(user);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('has-tabbar', Boolean(user));
    return () => document.body.classList.remove('has-tabbar');
  }, [user]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand" aria-label="Philippine Tourism home"><Logo /></Link>

          <nav className="nav-links" aria-label="Main">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>)}
          </nav>

          <div className="nav-end">
            <ThemeToggle />
            {user ? (
              <div className="nav-user">
                <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
                <span className="nav-user-name">
                  {user.name}
                  {isStaff(user) && <small>{isViewer(user) ? 'View only' : 'Admin'}</small>}
                </span>
                <button type="button" className="icon-btn nav-logout" title="Log out" aria-label="Log out" onClick={signOut}>
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="nav-auth">
                <Link to="/login" className="btn btn-ghost">Log in</Link>
                <Link to="/register" className="btn btn-primary">Sign up</Link>
              </div>
            )}
            <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="drawer"
              aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside id="drawer" className={`drawer ${open ? 'open' : ''}`} aria-label="Menu" aria-hidden={!open}>
        <div className="drawer-head">
          <Logo />
          <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
            <X size={22} />
          </button>
        </div>

        {user ? (
          <div className="drawer-user">
            <span className="avatar lg" aria-hidden="true">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <span className="muted small">{user.role === 'admin' ? 'Administrator' : isViewer(user) ? 'Admin (view only)' : user.email}</span>
            </div>
          </div>
        ) : (
          <div className="drawer-cta">
            <p className="muted">Log in to book trips and share feedback after your visit.</p>
            <div className="drawer-cta-buttons">
              <Link to="/login" className="btn btn-ghost" tabIndex={open ? 0 : -1}>Log in</Link>
              <Link to="/register" className="btn btn-primary" tabIndex={open ? 0 : -1}>Sign up</Link>
            </div>
          </div>
        )}

        <nav className="drawer-links" aria-label="Menu links">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} tabIndex={open ? 0 : -1}>
              <Icon size={19} aria-hidden="true" /> {label}
            </NavLink>
          ))}
          <ThemeToggle inDrawer tabIndex={open ? 0 : -1} />
        </nav>

        {user && (
          <button type="button" className="btn btn-ghost btn-block drawer-logout" onClick={signOut} tabIndex={open ? 0 : -1}>
            <LogOut size={17} /> Log out
          </button>
        )}
      </aside>

      {user && <TabBar user={user} />}
    </>
  );
}
