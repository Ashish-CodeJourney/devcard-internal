import { getPlatform } from '@devcard/shared';
import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  bio: z.string().max(300).nullable().optional(),
  // Accepts either a hosted http(s) image URL, or an on-device upload encoded
  // as a base64 data URI (downscaled client-side). Any image/* subtype is
  // allowed so platform-specific formats (e.g. image/heic) are not rejected.
  // Capped to keep list/detail responses and the profile cache reasonable.
  avatarUrl: z
    .string()
    .max(400000, 'Avatar image is too large')
    .refine(
      value =>
        /^https?:\/\/\S+$/i.test(value) ||
        /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+={0,2}$/i.test(value),
      { message: 'Avatar must be an http(s) URL or an uploaded image' },
    )
    .nullable()
    .optional(),
  pronouns: z.string().max(50).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional(),
}).strict(); // Unknown fields must error rather than being silently dropped.

export const createLinkSchema = z.object({
  platform: z.string().min(1).optional(),
  url: z.string().url().optional(),
  username: z.string().min(1).max(200).optional(),
}).superRefine((data, ctx) => {
  const hasUrl = Boolean(data.url);
  const hasPlatformAndUsername = Boolean(data.platform && data.username);

  if (!hasUrl && !hasPlatformAndUsername) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide a profile URL or a platform and username',
      path: ['url'],
    });
    return;
  }

  if (data.platform && data.username) {
    const platformDef = getPlatform(data.platform);
    if (platformDef?.validationRegex) {
      if (!platformDef.validationRegex.test(data.username)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid format for ${platformDef.name} handle`,
          path: ['username'],
        });
      }
    }
  }
});

export const reorderLinksSchema = z.object({
  links: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(0),
    })
  ),
});

