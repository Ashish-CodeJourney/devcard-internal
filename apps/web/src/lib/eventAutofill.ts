// ─── Event contact autofill ─────────────────────────────────────────────────
// Prefills the organiser contact fields from data the user already provided:
//  1. their DevCard profile (email always known after login), then
//  2. the contact they used on their last submission (localStorage), since
//     phone numbers are not part of the DevCard profile.

export interface ContactPatch {
  contactEmail?: string;
  contactPhone?: string;
}

export interface ProfileSnapshot {
  email?: string | null;
  phoneNumber?: string | null;
}

const STORAGE_KEY = 'devcard.eventContact.v1';

export function loadRememberedContact(): ContactPatch {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ContactPatch>;
    const patch: ContactPatch = {};
    if (typeof parsed.contactEmail === 'string' && parsed.contactEmail.trim()) {
      patch.contactEmail = parsed.contactEmail.trim();
    }
    if (typeof parsed.contactPhone === 'string' && parsed.contactPhone.trim()) {
      patch.contactPhone = parsed.contactPhone.trim();
    }
    return patch;
  } catch {
    return {};
  }
}

export function saveRememberedContact(patch: ContactPatch): void {
  try {
    const clean: ContactPatch = {};
    if (patch.contactEmail?.trim()) clean.contactEmail = patch.contactEmail.trim();
    if (patch.contactPhone?.trim()) clean.contactPhone = patch.contactPhone.trim();
    if (clean.contactEmail || clean.contactPhone) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
  } catch {
    // Storage unavailable (private mode) — autofill just won't persist.
  }
}

/** Profile values win; remembered contact fills the gaps. Empty in → empty out. */
export function buildAutofillPatch(profile: ProfileSnapshot | null, remembered: ContactPatch): ContactPatch {
  const patch: ContactPatch = {};
  const email = profile?.email?.trim() || remembered.contactEmail;
  const phone = profile?.phoneNumber?.trim() || remembered.contactPhone;
  if (email) patch.contactEmail = email;
  if (phone) patch.contactPhone = phone;
  return patch;
}
