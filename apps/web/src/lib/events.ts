import { apiFetch } from './api';

export type EventKind = 'HACKATHON' | 'MEETUP' | 'CONFERENCE' | 'OTHER';
export type EventStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type EventMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export const EVENT_MODES: { id: EventMode; label: string }[] = [
  { id: 'ONLINE', label: 'Online' },
  { id: 'OFFLINE', label: 'In person' },
  { id: 'HYBRID', label: 'Hybrid' },
];

export const EVENT_KINDS: { id: EventKind; label: string }[] = [
  { id: 'HACKATHON', label: 'Hackathon' },
  { id: 'MEETUP', label: 'Meetup' },
  { id: 'CONFERENCE', label: 'Conference' },
  { id: 'OTHER', label: 'Other' },
];

export interface EventSummary {
  id: string;
  name: string;
  slug: string;
  location: string;
  city: string | null;
  country: string | null;
  kind: EventKind;
  status: EventStatus;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  url: string | null;
  coverImageUrl: string | null;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  organizerId: string;
  organizerUsername: string;
  organizerDisplayName: string;
  createdAt: string;
  attendeesCount: number;
  rejectionReason: string | null;
  prizePool: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  registrationDeadline: string | null;
  teamSizeMin: number | null;
  teamSizeMax: number | null;
  mode: EventMode | null;
}

export interface EventInput {
  name: string;
  description?: string;
  location: string;
  city?: string;
  country?: string;
  kind: EventKind;
  startDate: string;
  endDate: string;
  url?: string;
  latitude?: number;
  longitude?: number;
  prizePool?: string;
  contactEmail?: string;
  contactPhone?: string;
  registrationDeadline?: string;
  teamSizeMin?: number;
  teamSizeMax?: number;
  mode?: EventMode;
}

export function formatTeamSize(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `${min}` : `${min}–${max}`;
  return `${min ?? max}`;
}

type Query = Record<string, string | number | undefined>;

function toQuery(params: Query): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listEvents(params: Query = {}) {
  return apiFetch<{ events: EventSummary[]; pagination: { page: number; limit: number; total: number } }>(
    `/api/events${toQuery(params)}`,
    { auth: false },
  );
}

export function nearbyEvents(lat: number, lng: number, radiusKm = 100) {
  return apiFetch<{ events: (EventSummary & { distanceKm: number | null })[] }>(
    `/api/events/nearby${toQuery({ lat, lng, radiusKm })}`,
    { auth: false },
  );
}

export function getEvent(slug: string) {
  return apiFetch<EventDetail>(`/api/events/${slug}`);
}

export function createEvent(input: EventInput) {
  return apiFetch<EventDetail>('/api/events', { method: 'POST', body: input });
}

export function myEvents() {
  return apiFetch<{ events: (EventSummary & { rejectionReason: string | null })[] }>('/api/events/mine');
}

export function adminQueue() {
  return apiFetch<{ events: (EventSummary & { description: string | null; organizer: { username: string; displayName: string; avatarUrl: string | null } })[] }>(
    '/api/events/admin/queue',
  );
}

export function setEventStatus(slug: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
  return apiFetch<EventDetail>(`/api/events/${slug}/status`, {
    method: 'PATCH',
    body: { status, reason },
  });
}

export function formatEventDates(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameDay = start.toDateString() === end.toDateString();
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (sameDay) return start.toLocaleDateString(undefined, opts);
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

export function formatPlace(event: Pick<EventSummary, 'city' | 'country' | 'location'>): string {
  const parts = [event.city, event.country].filter(Boolean);
  return parts.length ? parts.join(', ') : event.location;
}
