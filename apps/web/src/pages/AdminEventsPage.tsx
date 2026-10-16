import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/auth';
import { adminQueue, formatEventDates, formatPlace, setEventStatus } from '../lib/events';
import { ApiError } from '../lib/api';
import './EventsPages.css';

type QueueItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  city: string | null;
  country: string | null;
  kind: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startDate: string;
  endDate: string;
  url: string | null;
  latitude: number | null;
  organizer: { username: string; displayName: string; avatarUrl: string | null };
};

export default function AdminEventsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Event moderation | DevCard';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminQueue();
      setItems(data.events as QueueItem[]);
      setForbidden(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError('Could not load the queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, user, load]);

  const decide = async (slug: string, status: 'APPROVED' | 'REJECTED') => {
    let reason: string | undefined;
    if (status === 'REJECTED') {
      reason = window.prompt('Why is this being rejected? (shown to the organiser)') ?? undefined;
      if (reason === undefined) return;
    }
    setBusySlug(slug);
    try {
      await setEventStatus(slug, status, reason);
      setItems(prev => prev.filter(i => i.slug !== slug || status === 'REJECTED'));
      if (status === 'APPROVED') setItems(prev => prev.filter(i => i.slug !== slug));
      else await load();
    } catch (err: any) {
      setError(err?.message ?? 'Could not update that event.');
    } finally {
      setBusySlug(null);
    }
  };

  if (authLoading) {
    return <main className="events-page"><div className="events-empty glass">Loading…</div></main>;
  }

  return (
    <>
      <Navbar />
      <main className="events-page">
        <header className="events-header">
          <div>
            <span className="eyebrow">Moderation</span>
            <h1>Event queue</h1>
            <p className="events-subtitle">Approve events to publish them on the discovery map.</p>
          </div>
          <div className="events-header-actions">
            <button type="button" className="btn-outline" onClick={load} disabled={loading}>Refresh</button>
            <Link to="/events" className="btn-outline">Browse</Link>
          </div>
        </header>

        {error && <div className="events-notice error">{error}</div>}

        {!user ? (
          <div className="events-empty glass">
            <h2>Sign in required</h2>
            <Link to="/" className="btn-primary">Go to sign in</Link>
          </div>
        ) : forbidden || (!isAdmin && !loading && items.length === 0) ? (
          <div className="events-empty glass error">
            <h2>Admin access required</h2>
            <p>
              Your account is not a moderator. To grant access, either set the user's role to ADMIN or add the
              email to the <code>ADMIN_EMAILS</code> environment variable on the backend.
            </p>
          </div>
        ) : loading ? (
          <div className="events-empty glass">Loading queue…</div>
        ) : items.length === 0 ? (
          <div className="events-empty glass">
            <h2>Queue empty</h2>
            <p>Nothing is waiting for review.</p>
          </div>
        ) : (
          <ul className="events-list">
            {items.map(item => (
              <li key={item.id} className="event-row glass admin-row">
                <div className="event-row-main">
                  <div className="event-row-top">
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span>
                    <span className="event-kind">{item.kind}</span>
                    <span className="event-dates">{formatEventDates(item.startDate, item.endDate)}</span>
                  </div>
                  <h2>{item.name}</h2>
                  <p className="event-place">
                    {formatPlace(item)} · submitted by{' '}
                    <Link to={`/u/${item.organizer.username}`}>{item.organizer.displayName}</Link>
                  </p>
                  {item.description && <p className="event-description">{item.description}</p>}
                  <p className="field-hint">
                    {item.latitude === null ? 'No map pin — will not appear geographically.' : 'Has a map pin.'}
                    {item.url ? ` Registration: ${item.url}` : ''}
                  </p>
                </div>
                <div className="admin-actions">
                  <a className="btn-outline" href={`/events/${item.slug}`} target="_blank" rel="noreferrer">Preview</a>
                  <button
                    type="button"
                    className="btn-solid"
                    disabled={busySlug === item.slug}
                    onClick={() => decide(item.slug, 'APPROVED')}>
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={busySlug === item.slug}
                    onClick={() => decide(item.slug, 'REJECTED')}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
