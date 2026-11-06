import { Link, Route, Routes } from 'react-router-dom';
import { Compass, Settings } from 'lucide-react';
import Navbar, { Logo } from './components/Navbar.jsx';
import { UIProvider } from './components/overlays.jsx';
import ChatAssistant from './components/ChatAssistant.jsx';
import { EmptyState } from './components/ui.jsx';
import { RequireAuth, isStaff, useAuth } from './auth.jsx';
import { isConfigured } from './supabase.js';
import Destinations from './pages/Destinations.jsx';
import DestinationDetail from './pages/DestinationDetail.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyBookings from './pages/MyBookings.jsx';
import RateVisit from './pages/RateVisit.jsx';
import MyFeedback from './pages/MyFeedback.jsx';
import FeedbackAnalytics from './pages/admin/FeedbackAnalytics.jsx';
import AdminBookings from './pages/admin/AdminBookings.jsx';
import AdminDestinations from './pages/admin/AdminDestinations.jsx';
import DestinationForm from './pages/admin/DestinationForm.jsx';

function SetupNeeded() {
  return (
    <main className="container narrow-page">
      <EmptyState icon={Settings} title="Connect Supabase first">
        <p>Copy <code>client/.env.example</code> to <code>client/.env.local</code>, fill in your
          Supabase Project URL and anon key, then restart <code>npm run dev</code>.</p>
      </EmptyState>
    </main>
  );
}

function Footer() {
  const { user } = useAuth();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>Book trips across the Philippines and tell us how your visit really went.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/">Explore destinations</Link>
          {isStaff(user) ? (
            <>
              <Link to="/admin/feedback">Analytics</Link>
              <Link to="/admin/destinations">Manage destinations</Link>
            </>
          ) : user ? (
            <>
              <Link to="/bookings">My Bookings</Link>
              <Link to="/my-feedback">My Feedback</Link>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Create an account</Link>
            </>
          )}
        </nav>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} Philippine Tourism · Visitor feedback analyzed with VADER sentiment
      </div>
    </footer>
  );
}

export default function App() {
  if (!isConfigured) return <SetupNeeded />;
  return (
    <UIProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Destinations />} />
        <Route path="/destinations/:id" element={<DestinationDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
        <Route path="/bookings/:id/rate" element={<RequireAuth><RateVisit /></RequireAuth>} />
        <Route path="/my-feedback" element={<RequireAuth><MyFeedback /></RequireAuth>} />
        <Route path="/admin/feedback" element={<RequireAuth role={['admin', 'viewer']}><FeedbackAnalytics /></RequireAuth>} />
        <Route path="/admin/bookings" element={<RequireAuth role={['admin', 'viewer']}><AdminBookings /></RequireAuth>} />
        <Route path="/admin/destinations" element={<RequireAuth role={['admin', 'viewer']}><AdminDestinations /></RequireAuth>} />
        <Route path="/admin/destinations/new" element={<RequireAuth role="admin"><DestinationForm /></RequireAuth>} />
        <Route path="/admin/destinations/:id/edit" element={<RequireAuth role="admin"><DestinationForm /></RequireAuth>} />
        <Route path="*" element={<main className="container"><EmptyState icon={Compass} title="Page not found"><Link to="/">Back to destinations</Link></EmptyState></main>} />
      </Routes>
      <Footer />
      <ChatAssistant />
    </UIProvider>
  );
}
