import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EventsMap from '../components/EventsMap';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { EVENT_KINDS, EVENT_MODES, createEvent, type EventKind, type EventMode } from '../lib/events';
import { geocodeAddress } from '../lib/geocode';
import { buildAutofillPatch, loadRememberedContact, saveRememberedContact, type ContactPatch } from '../lib/eventAutofill';
import './EventsPages.css';
import './EventSubmit.css';

type GeoStatus = 'idle' | 'searching' | 'pinned' | 'unmatched' | 'manual';

interface ProfileSnapshot {
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
}

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
  // Competition details (hackathons).
  const [prizePool, setPrizePool] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [regDeadline, setRegDeadline] = useState('');
  const [teamMin, setTeamMin] = useState('');
  const [teamMax, setTeamMax] = useState('');
  const [mode, setMode] = useState<EventMode | ''>('');
  // Conference details (ticketing + call for papers).
  const [ticketPrice, setTicketPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [tracks, setTracks] = useState('');
  const [cfpDeadline, setCfpDeadline] = useState('');
  const [cfpUrl, setCfpUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showCompetition = kind === 'HACKATHON';
  const showConference = kind === 'CONFERENCE';
  const [error, setError] = useState<string | null>(null);
  // Auto-pin from the typed address. Manual map clicks win until the address changes.
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  // Profile-sourced autofill for the organiser contact fields.
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [remembered, setRemembered] = useState<ContactPatch>({});
  const prefilledRef = useRef(false);

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

  // Load the DevCard profile once — it carries the email (and phone, if ever set).
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    apiFetch<ProfileSnapshot>('/api/profiles/me')
      .then(p => {
        if (cancelled) return;
        setProfile(p);
        setRemembered(loadRememberedContact());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Prefill empty contact fields from the profile once (never clobbers typing).
  useEffect(() => {
    if (prefilledRef.current || !profile) return;
    prefilledRef.current = true;
    const patch = buildAutofillPatch(
      { email: profile.email ?? user?.email ?? null, phoneNumber: profile.phoneNumber ?? null },
      loadRememberedContact(),
    );
    if (patch.contactEmail) setContactEmail(prev => prev || patch.contactEmail!);
    if (patch.contactPhone) setContactPhone(prev => prev || patch.contactPhone!);
  }, [profile, user]);

  const applyAutofill = (patch: ContactPatch) => {
    if (patch.contactEmail) setContactEmail(patch.contactEmail);
    if (patch.contactPhone) setContactPhone(patch.contactPhone);
  };

  const handleAutofillProfile = () => {
    applyAutofill(buildAutofillPatch(
      { email: profile?.email ?? user?.email ?? null, phoneNumber: profile?.phoneNumber ?? null },
      loadRememberedContact(),
    ));
  };

  const showRememberChip =
    ((remembered.contactEmail && remembered.contactEmail !== contactEmail.trim()) ||
      (remembered.contactPhone && remembered.contactPhone !== contactPhone.trim())) ?? false;

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
    const min = teamMin.trim() === '' ? undefined : parseInt(teamMin, 10);
    const max = teamMax.trim() === '' ? undefined : parseInt(teamMax, 10);
    if (min !== undefined && max !== undefined && max < min) {
      setError('Max team size must be at least the min team size.');
      return;
    }
    if (showConference && cfpDeadline && new Date(cfpDeadline) >= new Date(startDate)) {
      setError('The call for papers must close before the event starts.');
      return;
    }

    setSubmitting(true);
    try {
      const contact = showCompetition || showConference
        ? {
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
          }
        : {};
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
        ...(showCompetition
          ? {
              prizePool: prizePool.trim() || undefined,
              registrationDeadline: regDeadline ? new Date(regDeadline).toISOString() : undefined,
              teamSizeMin: min,
              teamSizeMax: max,
              mode: mode || undefined,
              ...contact,
            }
          : {}),
        ...(showConference
          ? {
              ticketPrice: ticketPrice.trim() || undefined,
              capacity: capacity.trim() === '' ? undefined : parseInt(capacity, 10),
              tracks: tracks.trim() || undefined,
              cfpDeadline: cfpDeadline ? new Date(cfpDeadline).toISOString() : undefined,
              cfpUrl: cfpUrl.trim() || undefined,
              mode: mode || undefined,
              ...contact,
            }
          : {}),
      });
      saveRememberedContact({
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
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

  const avatarSrc = profile?.avatarUrl || user.avatarUrl;
  const displayName = profile?.displayName || user.displayName;
  const displayEmail = profile?.email || user.email;

  return (
    <>
      <Navbar />
      <main className="events-page">
        <div className="event-sheet">
          <div className="event-sheet-band">
            <div>
              <span className="event-sheet-eyebrow">Submit</span>
              <h1>New event</h1>
              <p>It goes live on the map as soon as you submit it.</p>
            </div>
            <Link to="/events" className="event-sheet-close" aria-label="Cancel">✕</Link>
          </div>

          {error && <div className="event-sheet-error">{error}</div>}

          <form className="event-sheet-body" onSubmit={submit}>
            <section className="event-sheet-profile">
              <span className="event-sheet-avatar">
                {avatarSrc
                  ? <img src={avatarSrc} alt="" />
                  : (displayName || 'D').charAt(0).toUpperCase()}
              </span>
              <div className="event-sheet-profile-info">
                <strong>{displayName}</strong>
                <span>{displayEmail}</span>
              </div>
              <div className="event-sheet-profile-actions">
                {showRememberChip && (
                  <button
                    type="button"
                    className="btn-remember"
                    onClick={() => applyAutofill(loadRememberedContact())}
                  >
                    Reuse last used contact
                  </button>
                )}
                <button type="button" className="btn-teal" onClick={handleAutofillProfile}>
                  Autofill my details
                </button>
              </div>
            </section>

            <section className="event-sheet-box">
              <h2 className="event-sheet-box-title">Basics</h2>
              <div className="sheet-field">
                <span>Event type *</span>
                <div className="sheet-pills" role="radiogroup" aria-label="Event type">
                  {EVENT_KINDS.map(k => (
                    <label key={k.id} className="sheet-pill">
                      <input
                        type="radio"
                        name="event-kind"
                        checked={kind === k.id}
                        onChange={() => setKind(k.id)}
                      />
                      {k.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="sheet-row">
                <label className="sheet-field" style={{ flex: '2 1 260px' }}>
                  <span>Event name *</span>
                  <input value={name} onChange={e => setName(e.target.value)} required minLength={3} maxLength={100} />
                </label>
                <label className="sheet-field">
                  <span>Registration link</span>
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </label>
              </div>
              <div className="sheet-row">
                <label className="sheet-field">
                  <span>Starts *</span>
                  <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </label>
                <label className="sheet-field">
                  <span>Ends *</span>
                  <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </label>
                <label className="sheet-field">
                  <span>Venue / address *</span>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Moscone Center, 747 Howard St"
                    required
                    maxLength={200}
                  />
                </label>
              </div>
              <div className="sheet-row">
                <label className="sheet-field">
                  <span>City</span>
                  <input value={city} onChange={e => setCity(e.target.value)} maxLength={120} />
                </label>
                <label className="sheet-field">
                  <span>Country</span>
                  <input value={country} onChange={e => setCountry(e.target.value)} maxLength={120} />
                </label>
              </div>
              <label className="sheet-field">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="What is this event about, who is it for, prizes, tracks…"
                />
              </label>
            </section>

            {showCompetition && (
              <section className="event-sheet-box">
                <h2 className="event-sheet-box-title">Competition</h2>
                <div className="sheet-field">
                  <span>Mode</span>
                  <div className="sheet-inline-radios" role="radiogroup" aria-label="Event mode">
                    {EVENT_MODES.map(m => (
                      <label key={m.id}>
                        <input
                          type="radio"
                          name="event-mode"
                          checked={mode === m.id}
                          onChange={() => setMode(m.id)}
                        />
                        {m.label}
                      </label>
                    ))}
                    {mode && (
                      <button type="button" className="link-button" onClick={() => setMode('')}>clear</button>
                    )}
                  </div>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field" style={{ flex: '2 1 260px' }}>
                    <span>Prize pool</span>
                    <input
                      value={prizePool}
                      onChange={e => setPrizePool(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. ₹5,00,000 + swags"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Registration deadline</span>
                    <input
                      type="datetime-local"
                      value={regDeadline}
                      onChange={e => setRegDeadline(e.target.value)}
                    />
                  </label>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Team size (min)</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={teamMin}
                      onChange={e => setTeamMin(e.target.value)}
                      placeholder="e.g. 2"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Team size (max)</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={teamMax}
                      onChange={e => setTeamMax(e.target.value)}
                      placeholder="e.g. 4"
                    />
                  </label>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Organiser email</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      maxLength={200}
                      placeholder="team@hackathon.dev"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Organiser phone</span>
                    <input
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      maxLength={40}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                </div>
              </section>
            )}

            {showConference && (
              <section className="event-sheet-box">
                <h2 className="event-sheet-box-title">Conference</h2>
                <div className="sheet-field">
                  <span>Mode</span>
                  <div className="sheet-inline-radios" role="radiogroup" aria-label="Event mode">
                    {EVENT_MODES.map(m => (
                      <label key={m.id}>
                        <input
                          type="radio"
                          name="event-mode"
                          checked={mode === m.id}
                          onChange={() => setMode(m.id)}
                        />
                        {m.label}
                      </label>
                    ))}
                    {mode && (
                      <button type="button" className="link-button" onClick={() => setMode('')}>clear</button>
                    )}
                  </div>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Ticket price</span>
                    <input
                      value={ticketPrice}
                      onChange={e => setTicketPrice(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Free, ₹999, $49"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Capacity (seats)</span>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      value={capacity}
                      onChange={e => setCapacity(e.target.value)}
                      placeholder="e.g. 500"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Tracks / topics</span>
                    <input
                      value={tracks}
                      onChange={e => setTracks(e.target.value)}
                      maxLength={300}
                      placeholder="e.g. AI, Web3, DevTools"
                    />
                  </label>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Call for papers closes</span>
                    <input
                      type="datetime-local"
                      value={cfpDeadline}
                      onChange={e => setCfpDeadline(e.target.value)}
                    />
                  </label>
                  <label className="sheet-field">
                    <span>CFP submission link</span>
                    <input
                      type="url"
                      value={cfpUrl}
                      onChange={e => setCfpUrl(e.target.value)}
                      maxLength={500}
                      placeholder="https://…"
                    />
                  </label>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Organiser email</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      maxLength={200}
                      placeholder="team@conference.dev"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Organiser phone</span>
                    <input
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      maxLength={40}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                </div>
              </section>
            )}

            <section className="event-sheet-box">
              <h2 className="event-sheet-box-title">Location</h2>
              <p className="sheet-hint">
                Click the map to drop a pin. This is what places the event on the discovery map — optional, but
                events without one cannot be found geographically.
              </p>
              <EventsMap height={300} zoom={2} pickable picked={picked} onPick={handlePick} focus={focus} />
              <p className="sheet-hint">
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
            </section>

            <div className="event-sheet-footer">
              <button type="submit" className="btn-navy" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Publish event'}
              </button>
              <Link to="/events" className="btn-sheet-outline">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
