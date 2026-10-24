import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLATFORMS, getProfileUrl } from '../shared';
import type { PublicProfile } from '../shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import ThemeCustomizer from '../components/ThemeCustomizer';
import './ProfilePage.css';
import './EventSubmit.css';

const platformColors: Record<string, string> = {
  github: '#181717', linkedin: '#0A66C2', twitter: '#000000',
  gitlab: '#FC6D26', devfolio: '#3770FF', npm: '#CB3837',
  devto: '#0A0A0A', hashnode: '#2962FF', medium: '#000000',
  leetcode: '#FFA116', hackerrank: '#00EA64', discord: '#5865F2',
  telegram: '#26A5E4', email: '#EA4335', portfolio: '#6366F1', custom: '#8B5CF6',
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [copyStatus, setCopyStatus] = useState<'success' | 'error'>('success');
  // Owner-only editing.
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', role: '', company: '', location: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isOwner = !!user && !!profile && user.username === profile.username;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    apiFetch<PublicProfile>(`/api/u/${username}?source=web`)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch(() => {
        setProfile(null);
        setError('User not found');
      })
      .finally(() => setLoading(false));
  }, [username]);

  async function copyProfileUrl() {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('Clipboard API unavailable. Copy the URL from your address bar.');
      setCopyStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage('Profile link copied.');
      setCopyStatus('success');
    } catch {
      setCopyMessage('Could not copy link. Copy the URL from your address bar.');
      setCopyStatus('error');
    }
    setTimeout(() => setCopyMessage(''), 3000);
  }

  // Update document title
  useEffect(() => {
    if (profile) {
      document.title = `${profile.displayName} | DevCard`;
    } else if (error) {
      document.title = 'User Not Found | DevCard';
    }
  }, [profile, error]);

  function openEdit() {
    if (!profile) return;
    setForm({
      displayName: profile.displayName,
      role: profile.role ?? '',
      company: profile.company ?? '',
      location: profile.location ?? '',
      bio: profile.bio ?? '',
    });
    setSaveError(null);
    setEditing(true);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const displayName = form.displayName.trim();
    if (!displayName) {
      setSaveError('Display name cannot be empty.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await apiFetch<Partial<PublicProfile>>('/api/profiles/me', {
        method: 'PUT',
        body: {
          displayName,
          role: form.role.trim() || null,
          company: form.company.trim() || null,
          location: form.location.trim() || null,
          bio: form.bio.trim() || null,
        },
      });
      setProfile({ ...profile, ...updated });
      setEditing(false);
    } catch (err: any) {
      setSaveError(err?.message ?? 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <div className="bg-gradient" />
        <main className="profile-container loaded">
          <div className="profile-card glass loading-card">
            <div className="skeleton skeleton-avatar" />
            <div className="skeleton skeleton-name" />
            <div className="skeleton skeleton-role" />
            <div className="skeleton skeleton-bio" />
            <div className="skeleton skeleton-link" />
            <div className="skeleton skeleton-link" />
          </div>
        </main>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <div className="bg-gradient" />
        <main className="profile-container loaded">
          <div className="error-glass glass">
            <div className="error-emoji">😕</div>
            <h1>Profile not found</h1>
            <p>This DevCard has vanished into the digital void.</p>
            <Link to="/" className="btn-primary">Return Home</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <div
        className="bg-gradient"
        style={{ '--accent': profile.accentColor || '#6366f1' } as React.CSSProperties}
      />
      <main className={`profile-container ${mounted ? 'loaded' : ''}`}>
        <div
          className="profile-card glass"
          style={{ '--accent': profile.accentColor } as React.CSSProperties}
          id="profile-card"
        >
          {isOwner && (
            <button
              type="button"
              className="profile-edit-float"
              onClick={() => (editing ? setEditing(false) : openEdit())}
            >
              {editing ? 'Close' : 'Edit'}
            </button>
          )}
          <header className="profile-header">
            <div className="avatar-wrapper">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="avatar"
                />
              ) : (
                <div
                  className="avatar avatar-placeholder"
                  style={{ background: profile.accentColor }}
                >
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="avatar-glow" style={{ background: profile.accentColor }} />
            </div>

            <h1 className="display-name">{profile.displayName}</h1>
            {isOwner && user?.email && (
              <p className="profile-email">{user.email}</p>
            )}
            {profile.role && (
              <div className="role-badge">
                {profile.role}{profile.company ? ` @ ${profile.company}` : ''}
              </div>
            )}
            {profile.bio && <p className="bio">{profile.bio}</p>}

            {profile.location && (
              <dl className="profile-meta">
                <div className="profile-meta-row">
                  <span className="profile-meta-ico" aria-hidden="true">📍</span>
                  <div>
                    <dt>Place</dt>
                    <dd>{profile.location}</dd>
                  </div>
                </div>
              </dl>
            )}
          </header>

          <div className="links-grid" id="profile-links">
            {profile.links.map((link, i) => {
              const platform = PLATFORMS[link.platform];
              const color = platformColors[link.platform] || '#6366f1';
              return (
                <a
                  key={link.id}
                  href={link.url || getProfileUrl(link.platform, link.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-tile glass"
                  style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}
                  id={`link-tile-${link.platform}`}
                >
                  <div className="tile-icon" style={{ background: color }}>
                    <span className="platform-initial">
                      {platform?.name.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="tile-content">
                    <span className="platform-name">
                      {platform?.name || link.platform}
                    </span>
                    <span className="username">@{link.username}</span>
                  </div>
                  <span className="arrow">→</span>
                </a>
              );
            })}
          </div>

          <footer className="card-footer">
            <p>Verified Developer Profile</p>
            <div className="logo-sm">⚡ DevCard</div>
          </footer>
        </div>

        {isOwner && editing && (
          <div className="profile-side">
            <section className="profile-sheet" aria-label="Edit profile">
              <h2 className="profile-sheet-title">Profile details</h2>
              {saveError && <div className="event-sheet-error" style={{ margin: 0 }}>{saveError}</div>}
              <form onSubmit={saveProfile}>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Name</span>
                    <input
                      value={form.displayName}
                      onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                      required
                      minLength={1}
                      maxLength={100}
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Role / title</span>
                    <input
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      maxLength={100}
                      placeholder="e.g. Full Stack Engineer"
                    />
                  </label>
                </div>
                <div className="sheet-row">
                  <label className="sheet-field">
                    <span>Company</span>
                    <input
                      value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      maxLength={100}
                      placeholder="e.g. DevCard Labs"
                    />
                  </label>
                  <label className="sheet-field">
                    <span>Place</span>
                    <input
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      maxLength={120}
                      placeholder="e.g. Mumbai, Remote"
                    />
                  </label>
                </div>
                <label className="sheet-field">
                  <span>Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                    maxLength={300}
                    placeholder="What do you do?"
                  />
                </label>
                <div className="profile-form-actions">
                  <button type="submit" className="btn-navy" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" className="btn-sheet-outline" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </section>

            <section className="profile-sheet" aria-label="Customize appearance">
              <h2 className="profile-sheet-title">Colours</h2>
              <p className="sheet-hint">Applies to this browser only.</p>
              <ThemeCustomizer />
            </section>
          </div>
        )}

        <div className="get-your-own">
          <p>Want a card like this?</p>
          <div className="profile-actions">
            <Link to="/" className="gradient-text get-devcard-link">
              Create your DevCard ⚡
            </Link>
            <button
              type="button"
              className="copy-link-button"
              onClick={copyProfileUrl}
              id="copy-link-btn"
            >
              Copy Link
            </button>
            {copyMessage && (
              <p className={`copy-message ${copyStatus}`} aria-live="polite">
                {copyMessage}
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
