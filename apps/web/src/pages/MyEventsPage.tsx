import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../lib/auth';
import { formatEventDates, formatPlace, myEvents } from '../lib/events';
import './EventsPages.css';

type Submission = {
  id: string;
  name: string;
  slug: string;
  location: string;
  city: string | null;
  country: string | null;
  kind: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startDate: string;
  endDate: string;
  rejectionReason: string | null;
};

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const submitted = params.get('submitted') === '1';

  useEffect(() => {
    document.title = 'My submissions | DevCard';
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    myEvents()
      .then(data => setEvents(data.events as Submission[]))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Navbar />
      <main className="events-page">
        <header className="events-header">
          <div>
            <span className="eyebrow">Your events</span>
            <h1>My submissions</h1>
            <p className="events-subtitle">Track what you have sent in and see its review status.</p>
          </div>
          <div className="events-header-actions">
            <Link to="/events" className="btn-outline">Browse</Link>
            <Link to="/events/new" className="btn-solid">Submit an event</Link>
          </div>
        </header>

        {submitted && (
          <div className="events-notice">
            Thanks — your event was submitted and is awaiting moderation.
          </div>
        )}

        {authLoading || loading ? (
          <div className="events-empty glass">Loading…</div>
        ) : !user ? (
          <div className="events-empty glass">
            <h2>Sign in required</h2>
            <p>Your submissions are tied to your DevCard account.</p>
            <Link to="/" className="btn-primary">Go to sign in</Link>
          </div>
        ) : events.length === 0 ? (
          <div className="events-empty glass">
            <h2>Nothing submitted yet</h2>
            <p>Hackathons, meetups and conferences you submit will appear here.</p>
            <Link to="/events/new" className="btn-primary">Submit an event</Link>
          </div>
        ) : (
          <ul className="events-list">
            {events.map(event => (
              <li key={event.id} className="event-row glass">
                <Link to={`/events/${event.slug}`} className="event-row-link">
                  <div className="event-row-main">
                    <div className="event-row-top">
                      <span className={`status-pill status-${event.status.toLowerCase()}`}>{event.status}</span>
                      <span className="event-dates">{formatEventDates(event.startDate, event.endDate)}</span>
                    </div>
                    <h2>{event.name}</h2>
                    <p className="event-place">{formatPlace(event)}</p>
                    {event.status === 'REJECTED' && event.rejectionReason && (
                      <p className="event-rejection">Reason: {event.rejectionReason}</p>
                    )}
                  </div>
                  <span className="arrow">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
