import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, MessageCircleQuestion, Send, Star, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { destinations as destinationsApi } from '../data.js';
import { SUGGESTIONS, answer, roleOf } from '../lib/assistant.js';
import { CategoryIcon, peso } from './ui.jsx';
import logoMark from '../assets/logo.webp';

const greeting = (user) => ({
  from: 'bot',
  text: user
    ? `Hi ${user.name.split(' ')[0]}! I can help with anything about this site. What would you like to know?`
    : 'Hi! I can answer questions about this site: destinations, booking, cancelling and feedback. What would you like to know?',
  suggest: true,
});

function BotMessage({ m, onPick, suggestions }) {
  return (
    <div className={`chat-msg bot ${m.destinations?.length ? 'has-list' : ''}`}>
      <p>{m.text}</p>
      {m.destinations?.length > 0 && (
        <ul className="chat-dests">
          {m.destinations.map((d) => (
            <li key={d.id}>
              <Link to={`/destinations/${d.id}`}>
                <span className="chat-dest-icon"><CategoryIcon category={d.category} size={16} aria-hidden="true" /></span>
                <span className="chat-dest-main">
                  <strong>{d.name}</strong>
                  <span className="muted">{d.province}, {d.region}</span>
                </span>
                <span className="chat-dest-meta">
                  <span>{peso(d.price)}</span>
                  {d.feedback_count > 0 && <span className="muted"><Star size={11} aria-hidden="true" /> {Number(d.avg_rating).toFixed(1)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {m.links?.length > 0 && (
        <div className="chat-links">
          {m.links.map((l) => <Link key={l.to} to={l.to}>{l.label} <ArrowRight size={13} aria-hidden="true" /></Link>)}
        </div>
      )}
      {m.suggest && (
        <div className="chat-suggest">
          {suggestions.map((s) => <button key={s} type="button" onClick={() => onPick(s)}>{s}</button>)}
        </div>
      )}
    </div>
  );
}

export default function ChatAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [greeting(user)]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [list, setList] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const suggestions = SUGGESTIONS[roleOf(user)];

  // New login/logout: start a fresh conversation for that person.
  useEffect(() => setMessages([greeting(user)]), [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch destinations once, the first time the chat opens.
  useEffect(() => {
    if (!open || list) return;
    destinationsApi.list().then(setList).catch(() => setList([]));
  }, [open, list]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Phones: the panel is full screen. Lock the page behind it, and follow the visual viewport so the
  // on-screen keyboard shrinks the panel instead of covering the input.
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 640px)').matches) return undefined;
    document.body.classList.add('no-scroll');
    const vv = window.visualViewport;
    const fit = () => {
      const el = panelRef.current;
      if (!el || !vv) return;
      el.style.setProperty('--chat-h', `${vv.height}px`);
      el.style.setProperty('--chat-top', `${vv.offsetTop}px`);
      listRef.current && (listRef.current.scrollTop = listRef.current.scrollHeight);
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    return () => {
      document.body.classList.remove('no-scroll');
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      panelRef.current?.style.removeProperty('--chat-h');
      panelRef.current?.style.removeProperty('--chat-top');
    };
  }, [open]);

  const ask = (question) => {
    const q = question.trim();
    if (!q || typing) return;
    setDraft('');
    setMessages((m) => [...m, { from: 'me', text: q }]);
    setTyping(true);
    // A short pause so the reply reads like a chat, not an instant swap.
    setTimeout(() => {
      setMessages((m) => [...m, { from: 'bot', ...answer(q, { user, destinations: list }) }]);
      setTyping(false);
    }, 450);
  };

  return (
    <>
      <button type="button" className={`chat-fab ${open ? 'hidden' : ''}`} onClick={() => setOpen(true)}
        aria-label="Open help chat" aria-expanded={open} aria-controls="chat-panel">
        <MessageCircleQuestion size={24} aria-hidden="true" />
        <span className="chat-fab-label">Need help?</span>
      </button>

      <section id="chat-panel" ref={panelRef} className={`chat-panel ${open ? 'open' : ''}`} aria-label="Help chat" aria-hidden={!open}>
        <header className="chat-head">
          <img src={logoMark} alt="" width="34" height="34" />
          <div>
            <strong>Tourism Assistant</strong>
            <span>Answers about this website</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Close help chat" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
            <X size={20} />
          </button>
        </header>

        <div className="chat-body" ref={listRef} role="log" aria-live="polite">
          {messages.map((m, i) => (m.from === 'me'
            ? <div key={i} className="chat-msg me"><p>{m.text}</p></div>
            : <BotMessage key={i} m={m} onPick={ask} suggestions={suggestions} />))}
          {typing && <div className="chat-msg bot typing" aria-label="Assistant is typing"><span /><span /><span /></div>}
        </div>

        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
          <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about booking, feedback…"
            aria-label="Your question" maxLength={300} tabIndex={open ? 0 : -1} />
          <button type="submit" className="btn btn-primary" aria-label="Send" disabled={!draft.trim() || typing} tabIndex={open ? 0 : -1}>
            <Send size={17} />
          </button>
        </form>
      </section>
    </>
  );
}
