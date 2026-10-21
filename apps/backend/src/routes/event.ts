import {generateUniqueSlug} from '../utils/slug.js'
import {
    createEventSchema,
    listEventsQuerySchema,
    updateEventStatusSchema,
} from '../validations/event.validation.js';
import { isAdmin } from '../utils/roles.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ─── Discovery helpers ────────────────────────────────────────────────────────

/** Only approved events are public; owners and admins can see the rest. */
const PUBLIC_WHERE = { status: 'APPROVED' as const };

function parseBbox(bbox?: string): { minLat: number; minLng: number; maxLat: number; maxLng: number } | null {
    if (!bbox) return null;
    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return null;
    const [minLat, minLng, maxLat, maxLng] = parts;
    return { minLat, minLng, maxLat, maxLng };
}

/** Great-circle distance in km — used to sort/bound "nearby" results. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

const EVENT_CARD_SELECT = {
    id: true,
    name: true,
    slug: true,
    location: true,
    city: true,
    country: true,
    kind: true,
    status: true,
    latitude: true,
    longitude: true,
    startDate: true,
    endDate: true,
    url: true,
    coverImageUrl: true,
} as const;

/**
 * Best-effort identity for public routes that behave differently for the owner
 * or an admin. Never fails the request — anonymous callers simply get null.
 */
async function optionalUserId(app: FastifyInstance, request: FastifyRequest): Promise<string | null> {
    const header = request.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookieToken = (request as unknown as { cookies?: Record<string, string> }).cookies?.access_Token;
    const token = bearer ?? cookieToken;
    if (!token) return null;
    try {
        const payload = app.jwt.verify(token) as { id?: string; sub?: string };
        return payload.id ?? payload.sub ?? null;
    } catch {
        return null;
    }
}




type EventDetails = {
    id: string;
    name: string;
    slug: string;
    location: string;
    description: string | null;
    organizerId: string; 
    organizerUsername: string;
    organizerDisplayName: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    attendeesCount: number;
    // Discovery / moderation
    kind: string;
    status: string;
    // Competition
    prizePool: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    registrationDeadline: Date | null;
    teamSizeMin: number | null;
    teamSizeMax: number | null;
    mode: string | null;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    country: string | null;
    url: string | null;
    coverImageUrl: string | null;
    rejectionReason: string | null;
}

type AttendeePublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
}


type PaginatedAttendeesResponse = {
  attendees: AttendeePublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;       
  };
}

type EventWithAttendees = {
  _count: {
    attendees: number;
  };
  attendees: {
    user: {
      id: string;
      username: string;
      displayName: string;
      bio: string | null;
      pronouns: string | null;
      company: string | null;
      avatarUrl: string | null;
      accentColor: string;
    };
  }[];
}

export async function eventRoutes(app:FastifyInstance): Promise<void> {
    // ─── Browse (public) ───
    // Only APPROVED events are ever public. Unapproved ones surface via /mine
    // (owner) or /admin/queue (moderator).
    app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = listEventsQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid query' });
        }
        const { q, kind, from, to, bbox, page, limit } = parsed.data;

        const take = Math.min(Number(limit) || 20, 100);
        const currentPage = Math.max(Number(page) || 1, 1);

        const where: any = { ...PUBLIC_WHERE };
        if (kind) where.kind = kind;
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { location: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { country: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (from || to) {
            where.startDate = {};
            if (from) where.startDate.gte = new Date(from);
            if (to) where.startDate.lte = new Date(to);
        }

        const box = parseBbox(bbox);
        if (box) {
            where.latitude = { gte: box.minLat, lte: box.maxLat };
            where.longitude = { gte: box.minLng, lte: box.maxLng };
        }

        try {
            const [events, total] = await Promise.all([
                app.prisma.event.findMany({
                    where,
                    orderBy: { startDate: 'asc' },
                    skip: (currentPage - 1) * take,
                    take,
                    select: EVENT_CARD_SELECT,
                }),
                app.prisma.event.count({ where }),
            ]);
            return reply.send({ events, pagination: { page: currentPage, limit: take, total } });
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ error: 'Failed to list events' });
        }
    });

    // ─── Nearby (public) ───
    app.get('/nearby', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as { lat?: string; lng?: string; radiusKm?: string };
        const lat = Number(query.lat);
        const lng = Number(query.lng);
        const radiusKm = Math.min(Number(query.radiusKm) || 100, 20000);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return reply.status(400).send({ error: 'lat and lng are required' });
        }

        // Cheap bounding-box prefilter, then an exact great-circle cut.
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

        try {
            const candidates = await app.prisma.event.findMany({
                where: {
                    ...PUBLIC_WHERE,
                    latitude: { gte: lat - latDelta, lte: lat + latDelta },
                    longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
                },
                orderBy: { startDate: 'asc' },
                take: 200,
                select: EVENT_CARD_SELECT,
            });

            const events = candidates
                .map(event => ({
                    ...event,
                    distanceKm:
                        event.latitude !== null && event.longitude !== null
                            ? Math.round(haversineKm(lat, lng, event.latitude, event.longitude) * 10) / 10
                            : null,
                }))
                .filter(event => event.distanceKm !== null && event.distanceKm <= radiusKm)
                .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));

            return reply.send({ events });
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ error: 'Failed to search nearby events' });
        }
    });

    // ─── My submissions (owner, all statuses) ───
    app.get('/mine', { preHandler: [(req, reply) => app.authenticate(req, reply)] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const events = await app.prisma.event.findMany({
                where: { organizerId: request.user.id },
                orderBy: { createdAt: 'desc' },
                select: { ...EVENT_CARD_SELECT, reviewedAt: true, rejectionReason: true },
            });
            return reply.send({ events });
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ error: 'Failed to load your events' });
        }
    });

    // ─── Moderation queue (admin) ───
    app.get('/admin/queue', { preHandler: [(req, reply) => app.authenticate(req, reply)] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!(await isAdmin(app, request.user.id))) {
            return reply.status(403).send({ error: 'Admin access required' });
        }
        try {
            const events = await app.prisma.event.findMany({
                where: { status: { in: ['PENDING', 'REJECTED'] } },
                orderBy: { createdAt: 'asc' },
                include: {
                    organizer: { select: { username: true, displayName: true, avatarUrl: true } },
                },
            });
            return reply.send({ events });
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ error: 'Failed to load the moderation queue' });
        }
    });

    // ─── Approve / reject (admin) ───
    app.patch<{ Params: { slug: string } }>('/:slug/status', { preHandler: [(req, reply) => app.authenticate(req, reply)] }, async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
        if (!(await isAdmin(app, request.user.id))) {
            return reply.status(403).send({ error: 'Admin access required' });
        }
        const parsed = updateEventStatusSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'Invalid status' });
        }

        const event = await app.prisma.event.findUnique({ where: { slug: request.params.slug } });
        if (!event) return reply.status(404).send({ error: 'Event not found' });

        const { status, reason } = parsed.data;
        const updated = await app.prisma.event.update({
            where: { id: event.id },
            data: {
                status,
                reviewedById: request.user.id,
                reviewedAt: new Date(),
                rejectionReason: status === 'REJECTED' ? (reason ?? null) : null,
            },
        });
        return reply.send(updated);
    });

    app.post<{Body: Record<string, unknown>}>('/', { preHandler: [(req, reply) => app.authenticate(req, reply)] }, async (request, reply) => {
         const userId = request.user.id;
        const parsed = createEventSchema.safeParse(request.body); 
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }
        
        const {
            name, description, startDate, endDate, isPublic, location,
            kind, latitude, longitude, city, country, url, coverImageUrl,
            prizePool, contactEmail, contactPhone, registrationDeadline,
            teamSizeMin, teamSizeMax, mode,
        } = parsed.data

        const finalSlug = await generateUniqueSlug(name, async(slug) => {
            const existing = await app.prisma.event.findUnique({where: {slug}})
            
            return !!existing
        })

        // Submissions are moderated. Admins publish straight away so they can
        // seed the map without approving their own entries.
        const status = (await isAdmin(app, userId)) ? 'APPROVED' : 'PENDING'

        try {
            const newEvent = await app.prisma.event.create({
                data: {
                    name, 
                    description, 
                    slug: finalSlug, 
                    location,
                    startDate: new Date(startDate), 
                    endDate: new Date(endDate), 
                    isPublic: isPublic ?? true, 
                    organizerId: userId,
                    kind: kind ?? 'HACKATHON',
                    latitude: latitude ?? null,
                    longitude: longitude ?? null,
                    city: city ?? null,
                    country: country ?? null,
                    url: url ?? null,
                    coverImageUrl: coverImageUrl ?? null,
                    prizePool: prizePool ?? null,
                    contactEmail: contactEmail ?? null,
                    contactPhone: contactPhone ?? null,
                    registrationDeadline: registrationDeadline ?? null,
                    teamSizeMin: teamSizeMin ?? null,
                    teamSizeMax: teamSizeMax ?? null,
                    mode: mode ?? null,
                    status,
                }
            })

            return reply.status(201).send(newEvent); 
        } catch (error) {
            app.log.error(error); 
            return reply.status(500).send({error: 'Failed to create event'})
        }
        
    })

    //Returns event details and attendees count
    app.get('/:slug', async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        const details = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug,
            },
            include: {
                _count: {
                    select: {
                        attendees: true
                    }
                },
                organizer: {
                    select: {
                        username: true,
                        displayName: true
                    }
                }
            }
        })
        if(!details){
            return reply.status(404).send({error: 'Event not found'})
        }

        // Unapproved events are only visible to their organiser or an admin.
        if (details.status !== 'APPROVED') {
            const viewerId = await optionalUserId(app, request);
            const allowed =
                viewerId !== null &&
                (viewerId === details.organizerId || (await isAdmin(app, viewerId)));
            if (!allowed) {
                return reply.status(404).send({ error: 'Event not found' });
            }
        }

        const response: EventDetails = {
            id: details.id,
            name: details.name,
            slug: details.slug,
            description: details.description,
            location: details.location,
            organizerId: details.organizerId,  
            organizerUsername: details.organizer.username,
            organizerDisplayName: details.organizer.displayName,
            startDate: details.startDate,
            endDate: details.endDate,
            createdAt: details.createdAt,
            attendeesCount: details._count.attendees,
            // Discovery / moderation
            kind: details.kind,
            status: details.status,
            latitude: details.latitude,
            longitude: details.longitude,
            city: details.city,
            country: details.country,
            url: details.url,
            coverImageUrl: details.coverImageUrl,
            rejectionReason: details.rejectionReason,
            // Competition
            prizePool: details.prizePool,
            contactEmail: details.contactEmail,
            contactPhone: details.contactPhone,
            registrationDeadline: details.registrationDeadline,
            teamSizeMin: details.teamSizeMin,
            teamSizeMax: details.teamSizeMax,
            mode: details.mode,
        }
        
        return response; 
    })

     app.post<{ Params: { slug: string } }>('/:slug/join', {preHandler: [(req, reply) => app.authenticate(req, reply)]}, async(request, reply) => {
        const userId = request.user.id;
        const paramsSlug = request.params.slug; 

        const event = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug
            }
        })

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

        try {
            await app.prisma.eventAttendee.create({
                data: {
                    eventId: event.id, 
                    userId, 
                    joinedAt: new Date()
                }
            })

            return reply.status(201).send({message: 'User joined successfully'})
        } catch (error:any) {
            if(error.code === "P2002" ){
                return reply.status(409).send({error: 'Already joined'})
            }
            app.log.error((error as Error).message); 
            return reply.status(500).send({error: 'Failed to join'})
        }

    })
    app.delete<{Params: {slug: string}}>('/:slug/leave',{preHandler: [(req, reply) => app.authenticate(req, reply)]}, async(request, reply) => {

       const userId = request.user.id;
        const paramsSlug = request.params.slug; 

        const event = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug
            }
        })

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

        try {
            await app.prisma.eventAttendee.delete({
                where: {
                    userId_eventId: {
                        userId, 
                        eventId: event.id
                    }
                }
            })
            return reply.status(204).send()
        } catch (error:any) {
            if(error.code === 'P2025'){
                return reply.status(404).send({error: 'User not found'})
            }
            app.log.error((error as Error).message)
            return reply.status(500).send({error: 'Failed to leave'})
        }
    })

    app.get('/:slug/attendees', async(request: FastifyRequest<{Params: {slug: string}, Querystring: {page?:string; limit?: string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        const page = Math.max(1, Number(request.query.page) || 1); 
        const limit = Math.min(50, Number(request.query.limit) || 10); 
        const skip = (page - 1) * limit
        const event = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug
            }, 
            include: {
                _count: {
                    select: { attendees: true }
                },
                attendees : {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true, 
                                displayName:true,
                                bio: true,
                                pronouns: true,
                                company: true, 
                                avatarUrl: true,
                                accentColor: true  
                            }
                        }
                    }, 
                    skip,
                    take: limit,
                    orderBy: {joinedAt: 'desc'}
                }
            }, 
        })as EventWithAttendees | null;

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

         
        const attendees = event.attendees.map((attendee: EventWithAttendees['attendees'][number]) => ({
            id: attendee.user.id,
            username: attendee.user.username,
            displayName: attendee.user.displayName,
            bio: attendee.user.bio,
            pronouns: attendee.user.pronouns,
            company: attendee.user.company,
            avatarUrl: attendee.user.avatarUrl,
            accentColor: attendee.user.accentColor,
        }));

        const response: PaginatedAttendeesResponse = {
            attendees,
            pagination: {
                page, 
                limit, 
                total : event._count.attendees,
            }
        }

        return response; 
    })
}
