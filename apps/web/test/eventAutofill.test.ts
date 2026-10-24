import { describe, it, expect, beforeEach } from 'vitest';
import { buildAutofillPatch, loadRememberedContact, saveRememberedContact } from '../src/lib/eventAutofill';

beforeEach(() => {
  localStorage.clear();
});

describe('buildAutofillPatch', () => {
  it('prefers profile values over remembered ones', () => {
    const patch = buildAutofillPatch(
      { email: 'me@dev.com', phoneNumber: '+911234567890' },
      { contactEmail: 'old@dev.com', contactPhone: '+910000000000' },
    );
    expect(patch).toEqual({ contactEmail: 'me@dev.com', contactPhone: '+911234567890' });
  });

  it('falls back to remembered contact for missing profile fields', () => {
    const patch = buildAutofillPatch(
      { email: 'me@dev.com', phoneNumber: null },
      { contactEmail: 'old@dev.com', contactPhone: '+910000000000' },
    );
    expect(patch).toEqual({ contactEmail: 'me@dev.com', contactPhone: '+910000000000' });
  });

  it('returns empty patch when nothing is known', () => {
    expect(buildAutofillPatch(null, {})).toEqual({});
    expect(buildAutofillPatch({ email: '  ', phoneNumber: null }, {})).toEqual({});
  });
});

describe('remembered contact storage', () => {
  it('round-trips through localStorage and ignores junk', () => {
    expect(loadRememberedContact()).toEqual({});
    saveRememberedContact({ contactEmail: '  a@b.com ', contactPhone: '' });
    expect(loadRememberedContact()).toEqual({ contactEmail: 'a@b.com' });
    localStorage.setItem('devcard.eventContact.v1', 'not-json{');
    expect(loadRememberedContact()).toEqual({});
  });

  it('does not store empty patches', () => {
    saveRememberedContact({});
    expect(localStorage.getItem('devcard.eventContact.v1')).toBeNull();
  });
});
