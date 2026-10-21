import {z} from 'zod'

export const EVENT_KINDS = ['HACKATHON', 'MEETUP', 'CONFERENCE', 'OTHER'] as const
export const EVENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export const EVENT_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'] as const

export const createEventSchema = z.object({
    name: z.string().min(3, 'Event name must be at least 3 characters long').max(100,'Event name cannot be longer than 100 characters'), 
    description: z.string().min(1).max(4000).optional(), 
    location: z.string().min(2, 'Location should be atleast 2 characters long').max(200,'Location cannot be longer than 200 characters'),
    startDate: z.string().pipe(z.coerce.date()),
    endDate:   z.string().pipe(z.coerce.date()),
    isPublic: z.boolean().default(true),

    // ─── Discovery ───
    kind: z.enum(EVENT_KINDS).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    city: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    /** External registration link. */
    url: z.string().url('Registration link must be a valid URL').max(500).optional(),
    coverImageUrl: z.string().url().max(500).optional(),

    // ─── Competition ───
    prizePool: z.string().max(200).optional(),
    contactEmail: z.string().email('Contact email must be a valid email').max(200).optional(),
    contactPhone: z.string().max(40).optional(),
    registrationDeadline: z.string().pipe(z.coerce.date()).optional(),
    teamSizeMin: z.number().int().min(1).max(100).optional(),
    teamSizeMax: z.number().int().min(1).max(100).optional(),
    mode: z.enum(EVENT_MODES).optional(),
})
.superRefine((data, ctx) => {
    // Coordinates must be supplied together.
    const hasLat = data.latitude !== undefined
    const hasLng = data.longitude !== undefined
    if (hasLat !== hasLng) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide both latitude and longitude, or neither',
            path: ['latitude'],
        })
    }
    if (data.endDate < data.startDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End date must be after the start date',
            path: ['endDate'],
        })
    }
    if (
        data.teamSizeMin !== undefined &&
        data.teamSizeMax !== undefined &&
        data.teamSizeMax < data.teamSizeMin
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Max team size must be at least the min team size',
            path: ['teamSizeMax'],
        })
    }
})

/** Query for browsing / map viewport searches. */
export const listEventsQuerySchema = z.object({
    q: z.string().max(120).optional(),
    kind: z.enum(EVENT_KINDS).optional(),
    status: z.enum(EVENT_STATUSES).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    /** minLat,minLng,maxLat,maxLng */
    bbox: z.string().max(120).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
}).strict()

export const updateEventStatusSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().max(500).optional(),
}).strict()

export const joinEventSchema = z.object({})
