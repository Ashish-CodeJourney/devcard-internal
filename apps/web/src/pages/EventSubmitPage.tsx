import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EventsMap from '../components/EventsMap';
import { useAuth } from '../lib/auth';
import { EVENT_KINDS, createEvent, type EventKind } from '../lib/events';
import { geocodeAddress } from '../lib/geocode';
import './EventsPages.css';

type GeoStatus = 'idle' | 'searching' | 'pinned' | 'unmatched' | 'manual';

export default function EventSubmitPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<EventKind>('HACKATHON');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [url, setUrl] = useState('');
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auto-pin from the typed address. Manual map clicks win until the address changes.
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Submit an event | DevCard';
  }, []);

  // Debounced forward-geocode: typing a venue drops the pin for you.
  // No match (or too short) leaves the pin alone — zoom in and click instead.
  useEffect(() => {
    const query = [location, city, country].filter(Boolean).join(', ');
    if (query.trim().length < 4) {
      setGeoStatus(s => (s === 'searching' ? 'idle' : s));
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGeoStatus('searching');
      const hit = await geocodeAddress(query, controller.signal);
      if (cancelled) return;
      if (hit) {
        setPicked([hit.lat, hit.lng]);
        setFocus([hit.lat, hit.lng]);
        setPinLabel(hit.label);
        setGeoStatus('pinned');
      } else {
        setGeoStatus('unmatched');
      }
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [location, city, country]);

  const handlePick = (lat: number, lng: number) => {
    setPicked([lat, lng]);
    setFocus(null);
    setPinLabel(null);
    setGeoStatus('manual');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError('Both a start and an end date are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('The end date must be after the start date.');
      return;
    }

    setSubmitting(true);
    try {
      await createEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        kind,
        location: location.trim(),
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        url: url.trim() || undefined,
        latitude: picked?.[0],
        longitude: picked?.[1],
      });
      navigate('/events/mine?submitted=1', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Could not submit the event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <main className="events-page"><div className="events-empty glass">Loading…</div></main>;
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="events-page">
          <div className="events-empty glass">
            <h2>Sign in to submit an event</h2>
            <p>Events are tied to a DevCard account so you can manage and track them.</p>
            <Link to="/" className="btn-primary">Go to sign in</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="events-page">
        <header className="events-header">
          <div>
            <span className="eyebrow">Submit</span>
            <h1>New event</h1>
            <p className="events-subtitle">
              It will be reviewed by a moderator before it appears on the map.
            </p>
          </div>
          <Link to="/events" className="btn-outline">Cancel</Link>
        </header>

        {error && <div className="events-notice error">{error}</div>}

        <form className="event-form glass" onSubmit={submit}>
          <label className="field">
            <span>Event name *</span>
            <input value={name} onChange={e => setName(e.target.value)} required minLength={3} maxLength={100} />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Type *</span>
              <select value={kind} onChange={e => setKind(e.target.value as EventKind)}>
                {EVENT_KINDS.map(k => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Registration link</span>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Starts *</span>
              <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </label>
            <label className="field">
              <span>Ends *</span>
              <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </label>
          </div>

          <label className="field">
            <span>Venue / address *</span>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Moscone Center, 747 Howard St"
              required
              maxLength={200}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>City</span>
              <input value={city} onChange={e => setCity(e.target.value)} maxLength={120} />
            </label>
            <label className="field">
              <span>Country</span>
              <input value={country} onChange={e => setCountry(e.target.value)} maxLength={120} />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What is this event about, who is it for, prizes, tracks…"
            />
          </label>

          <div className="field">
            <span>Location on the map</span>
            <p className="field-hint">
              Click the map to drop a pin. This is what places the event on the discovery map — optional, but
              events without one cannot be found geographically.
            </p>
            <EventsMap height={300} zoom={2} pickable picked={picked} onPick={handlePick} focus={focus} />
            <p className="field-hint">
              {geoStatus === 'searching' && 'Looking up that address…'}
              {geoStatus === 'pinned' && picked && (
                <>📍 Pinned from the address{pinLabel ? ` — ${pinLabel.split(',').slice(0, 2).join(',')}` : ''}. Click the map to adjust.</>
              )}
              {geoStatus === 'unmatched' && 'No match for that address — zoom in and click the map to place the pin.'}
              {geoStatus === 'manual' && picked && (
                <>Pinned by hand at {picked[0].toFixed(4)}, {picked[1].toFixed(4)}. </>
              )}
              {geoStatus === 'idle' && (picked
                ? `Pinned at ${picked[0].toFixed(4)}, ${picked[1].toFixed(4)} — `
                : 'Type a venue above to drop a pin automatically, or click the map. ')}
              {picked && (
                <button type="button" className="link-button" onClick={() => setPicked(null)}>clear</button>
              )}
            </p>
          </div>

          <div className="event-form-actions">
            <button type="submit" className="btn-solid" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
