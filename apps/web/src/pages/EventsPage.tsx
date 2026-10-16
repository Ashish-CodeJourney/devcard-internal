import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EventsMap, { type MapMarker } from '../components/EventsMap';
import { useAuth } from '../lib/auth';
import {
  EVENT_KINDS,
  formatEventDates,
  formatPlace,
  listEvents,
  nearbyEvents,
  type EventKind,
  type EventSummary,
} from '../lib/events';
import './EventsPages.css';

type GeoStatus = 'idle' | 'locating' | 'error';

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<EventKind | ''>('');
  const [nearMe, setNearMe] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  useEffect(() => {
    document.title = 'Events & Hackathons | DevCard';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEvents({ q: query, kind, limit: 100 });
      setEvents(data.events);
    } catch {
      setError('Could not load events.');
    } finally {
      setLoading(false);
    }
  }, [query, kind]);

  useEffect(() => {
    const t = window.setTimeout(load, query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const data = await nearbyEvents(position.coords.latitude, position.coords.longitude, 500);
          setNearMe(true);
          setEvents(data.events);
          setGeoStatus('idle');
        } catch {
          setGeoStatus('error');
        }
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const markers: MapMarker[] = useMemo(
    () =>
      events
        .filter(e => e.latitude !== null && e.longitude !== null)
        .map(e => ({ id: e.id, lat: e.latitude as number, lng: e.longitude as number, label: e.name })),
    [events],
  );

  const mappable = events.filter(e => e.latitude !== null).length;

  return (
    <>
      <Navbar />
      <main className="events-page">
        <header className="events-header">
          <div>
            <span className="eyebrow">Discover</span>
            <h1>Events &amp; Hackathons</h1>
            <p className="events-subtitle">
              Hackathons, meetups and conferences from around the globe — browse the map or the list.
            </p>
          </div>
          {user ? (
            <div className="events-header-actions">
              <Link to="/events/mine" className="btn-outline">My submissions</Link>
              <Link to="/events/new" className="btn-solid">Submit an event</Link>
            </div>
          ) : (
            <div className="events-header-actions">
              <Link to="/" className="btn-solid">Sign in to submit</Link>
            </div>
          )}
        </header>

        <section className="events-filters glass">
          <input
            type="search"
            className="events-search"
            placeholder="Search by name, city or country…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search events"
          />
          <select
            className="events-select"
            value={kind}
            onChange={e => setKind(e.target.value as EventKind | '')}
            aria-label="Filter by type">
            <option value="">All types</option>
            {EVENT_KINDS.map(k => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
          <button type="button" className="btn-outline" onClick={useMyLocation} disabled={geoStatus === 'locating'}>
            {geoStatus === 'locating' ? 'Locating…' : 'Near me'}
          </button>
        </section>

        <section className="events-map-wrap glass">
          <EventsMap markers={markers} height={420} />
          <p className="events-map-note">
            {mappable} of {events.length} events have a location. Select a pin for the name, then open it in the list.
          </p>
        </section>

        {nearMe && (
          <p className="events-notice">
            Showing the {events.length} nearest events.{' '}
            <button type="button" className="link-button" onClick={() => { setNearMe(false); load(); }}>
              Clear
            </button>
          </p>
        )}

        {geoStatus === 'error' && (
          <p className="events-notice error">Location unavailable — browse the map or search instead.</p>
        )}

        {loading ? (
          <div className="events-empty glass">Loading events…</div>
        ) : error ? (
          <div className="events-empty glass error">
            {error}
            <button type="button" className="btn-outline" onClick={load}>Retry</button>
          </div>
        ) : events.length === 0 ? (
          <div className="events-empty glass">
            <h2>No events yet</h2>
            <p>Nothing matches those filters. {user ? 'Be the first to submit one.' : 'Sign in to submit one.'}</p>
            {user && <Link to="/events/new" className="btn-primary">Submit an event</Link>}
          </div>
        ) : (
          <ul className="events-list">
            {events.map(event => (
              <li key={event.id} className="event-row glass">
                <Link to={`/events/${event.slug}`} className="event-row-link">
                  <div className="event-row-main">
                    <div className="event-row-top">
                      <span className={`event-kind kind-${event.kind.toLowerCase()}`}>{event.kind}</span>
                      <span className="event-dates">{formatEventDates(event.startDate, event.endDate)}</span>
                    </div>
                    <h2>{event.name}</h2>
                    <p className="event-place">{formatPlace(event)}</p>
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
