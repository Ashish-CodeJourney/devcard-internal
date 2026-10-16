import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import './EventsPages.css';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { completeLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    // React 18 StrictMode invokes effects twice; the exchange code is one-time.
    if (ranRef.current) return;
    ranRef.current = true;

    const err = params.get('error');
    const code = params.get('code');

    if (err) {
      setError(decodeURIComponent(err));
      return;
    }
    if (!code) {
      setError('No authorization code was returned.');
      return;
    }

    completeLogin(code)
      .then(() => navigate('/events', { replace: true }))
      .catch(e => setError(e?.message ?? 'The sign-in could not be completed.'));
  }, [params, completeLogin, navigate]);

  return (
    <main className="events-page">
      <div className="events-empty glass">
        {error ? (
          <>
            <h1>Sign-in failed</h1>
            <p>{error}</p>
            <Link to="/" className="btn-primary">Back to home</Link>
          </>
        ) : (
          <p>Signing you in…</p>
        )}
      </div>
    </main>
  );
}
