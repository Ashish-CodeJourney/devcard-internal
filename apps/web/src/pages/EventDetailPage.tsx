import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EventsMap, { type MapMarker } from '../components/EventsMap';
import { formatEventDates, formatPlace, getEvent, type EventDetail } from '../lib/events';
import './EventsPages.css';

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getEvent(slug)
      .then(data => {
        setEvent(data);
        document.title = `${data.name} | DevCard`;
      })
      .catch(() => setError('This event could not be found, or is not public yet.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const copyCode = async () => {
    if (!event || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(event.slug);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const markers: MapMarker[] =
    event && event.latitude !== null && event.longitude !== null
      ? [{ id: event.id, lat: event.latitude, lng: event.longitude, label: event.name }]
      : [];

  const center: [number, number] | undefined =
    event && event.latitude !== null && event.longitude !== null
      ? [event.latitude, event.longitude]
      : undefined;

  return (
    <>
      <Navbar />
      <main className="events-page">
        {loading ? (
          <div className="events-empty glass">Loading event…</div>
        ) : error || !event ? (
          <div className="events-empty glass error">
            <h2>Event not found</h2>
            <p>{error}</p>
            <Link to="/events" className="btn-primary">Browse events</Link>
          </div>
        ) : (
          <>
            <header className="events-header">
              <div>
                <span className={`event-kind kind-${event.kind.toLowerCase()}`}>{event.kind}</span>
                <h1>{event.name}</h1>
                <p className="events-subtitle">
                  {formatEventDates(event.startDate, event.endDate)} · {formatPlace(event)}
                </p>
              </div>
              <div className="events-header-actions">
                <Link to="/events" className="btn-outline">All events</Link>
                {event.url && (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="btn-solid">
                    Register
                  </a>
                )}
              </div>
            </header>

            {event.status !== 'APPROVED' && (
              <div className="events-notice">
                This event is <strong>{event.status.toLowerCase()}</strong> and is only visible to you and moderators.
              </div>
            )}

            <section className="event-detail-grid">
              <article className="event-detail glass">
                {event.description ? (
                  <p className="event-description">{event.description}</p>
                ) : (
                  <p className="event-description muted">No description provided.</p>
                )}

                <dl className="event-facts">
                  <div>
                    <dt>Venue</dt>
                    <dd>{event.location}</dd>
                  </div>
                  {(event.city || event.country) && (
                    <div>
                      <dt>Location</dt>
                      <dd>{formatPlace(event)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Attending on DevCard</dt>
                    <dd>{event.attendeesCount}</dd>
                  </div>
                  <div>
                    <dt>Organiser</dt>
                    <dd>
                      <Link to={`/u/${event.organizerUsername}`}>{event.organizerDisplayName}</Link>
                    </dd>
                  </div>
                </dl>

                <div className="event-app-hint">
                  <p>
                    Open the <strong>DevCard app</strong> → Events, and enter this code to view and register from
                    your phone:
                  </p>
                  <div className="event-code">
                    <code>{event.slug}</code>
                    <button type="button" className="copy-link-button" onClick={copyCode}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </article>

              {markers.length > 0 ? (
                <div className="event-map glass">
                  <EventsMap markers={markers} center={center} zoom={11} height={320} />
                </div>
              ) : (
                <div className="event-map glass muted">
                  No map location was provided for this event.
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
