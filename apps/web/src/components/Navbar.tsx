import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { ACCENT_OPTIONS, BACKGROUND_OPTIONS, FONT_OPTIONS } from '../theme/tokens';
import './Navbar.css';

type IconState = 'idle' | 'hiding' | 'showing';

const SunIcon = () => (
  <svg xmlns="http://www.apache.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.apache.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  </svg>
);

const DevCardLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="14" x="3" y="5" rx="2" ry="2"></rect>
    <line x1="3" x2="21" y1="9" y2="9"></line>
    <line x1="13" x2="13.01" y1="15" y2="15"></line>
  </svg>
);

export default function Navbar() {
  const {
    theme, toggleTheme,
    accentColor, setAccentColor,
    backgroundColor, setBackgroundColor,
    fontId, setFontId,
  } = useTheme();
  const { user, isAdmin, login, logout } = useAuth();
  const navigate = useNavigate();
  const [iconState, setIconState] = useState<IconState>('idle');
  const [displayedTheme, setDisplayedTheme] = useState(theme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);

  const handleToggle = () => {
    if (iconState !== 'idle') return;
    setIconState('hiding');
  };

  const handleAnimationEnd = () => {
    if (iconState === 'hiding') {
      toggleTheme();
      setDisplayedTheme(t => (t === 'dark' ? 'light' : 'dark'));
      setIconState('showing');
    } else if (iconState === 'showing') {
      setIconState('idle');
    }
  };

  const handleSignOut = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar" id="main-nav">
      <div className="nav-content">
        <Link to="/" className="logo" id="nav-logo">
          <DevCardLogo />
          <span className="logo-text">DevCard</span>
        </Link>

        <div className="nav-right">
          <Link to="/events" className="nav-link" id="nav-events">Events</Link>
          <Link to="/leaderboard" className="nav-link" id="nav-leaderboard">Leaderboard</Link>

          {user ? (
            <div className="nav-account">
              <button
                type="button"
                className="nav-account-button"
                onClick={() => setMenuOpen(open => !open)}
                aria-expanded={menuOpen}>
                <span className="nav-account-name">{user.displayName || user.username}</span>
              </button>
              {menuOpen && (
                <div className="nav-menu glass">
                  <Link to="/events/mine" onClick={() => setMenuOpen(false)}>My submissions</Link>
                  <Link to="/events/new" onClick={() => setMenuOpen(false)}>Submit an event</Link>
                  <Link to={`/u/${user.username}`} onClick={() => setMenuOpen(false)}>My profile</Link>
                  {isAdmin && <Link to="/admin/events" onClick={() => setMenuOpen(false)}>Moderation queue</Link>}
                  <button type="button" onClick={handleSignOut}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-account">
              <button
                type="button"
                className="nav-signin"
                onClick={() => setMenuOpen(open => !open)}
                aria-expanded={menuOpen}>
                Sign in
              </button>
              {menuOpen && (
                <div className="nav-menu glass">
                  <button type="button" onClick={() => login('github')}>Continue with GitHub</button>
                  <button type="button" onClick={() => login('google')}>Continue with Google</button>
                </div>
              )}
            </div>
          )}

          <button
            className="theme-toggle"
            onClick={handleToggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            id="theme-toggle-btn">
            <span
              className={`theme-toggle-icon ${iconState !== 'idle' ? iconState : ''}`}
              onAnimationEnd={handleAnimationEnd}
              aria-hidden="true">
              {displayedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>

          <div className="nav-account">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setThemePanelOpen(open => !open)}
              aria-label="Customize theme"
              aria-expanded={themePanelOpen}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="1" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r="1" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.2A4.34 4.34 0 0 0 21 11.66C21 6.36 17 2 12 2z" />
              </svg>
            </button>
            {themePanelOpen && (
              <div className="nav-menu glass theme-panel" role="dialog" aria-label="Customize theme">
                <p className="theme-panel-title">Accent</p>
                <div className="theme-swatches">
                  {ACCENT_OPTIONS.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      title={a.name}
                      aria-label={`${a.name} accent`}
                      aria-pressed={accentColor.toLowerCase() === a.hex.toLowerCase()}
                      className={`theme-swatch${accentColor.toLowerCase() === a.hex.toLowerCase() ? ' selected' : ''}`}
                      style={{ background: a.hex }}
                      onClick={() => setAccentColor(a.hex)}
                    />
                  ))}
                </div>
                <p className="theme-panel-title">Background</p>
                <div className="theme-swatches">
                  {BACKGROUND_OPTIONS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      title={b.name}
                      aria-label={`${b.name} background`}
                      aria-pressed={backgroundColor.toLowerCase() === b.hex.toLowerCase()}
                      className={`theme-swatch${backgroundColor.toLowerCase() === b.hex.toLowerCase() ? ' selected' : ''}`}
                      style={{ background: b.hex }}
                      onClick={() => setBackgroundColor(b.hex)}
                    />
                  ))}
                </div>
                <p className="theme-panel-title">Font</p>
                <div className="theme-fonts" role="radiogroup" aria-label="Font">
                  {FONT_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={fontId === f.id}
                      className={`theme-font${fontId === f.id ? ' selected' : ''}`}
                      style={{ fontFamily: f.sans }}
                      onClick={() => setFontId(f.id)}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
