import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProfilePage from './pages/ProfilePage';
import CardPage from './pages/CardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import NotFound from './pages/NotFound';
import AuthCallbackPage from './pages/AuthCallbackPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventSubmitPage from './pages/EventSubmitPage';
import MyEventsPage from './pages/MyEventsPage';
import AdminEventsPage from './pages/AdminEventsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/u/:username" element={<ProfilePage />} />
      <Route path="/devcard/:id" element={<CardPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />

      {/* Auth */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Events — static segments are ranked above /events/:slug by the router,
          so /events/new and /events/mine resolve correctly. */}
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/new" element={<EventSubmitPage />} />
      <Route path="/events/mine" element={<MyEventsPage />} />
      <Route path="/events/:slug" element={<EventDetailPage />} />
      <Route path="/admin/events" element={<AdminEventsPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
