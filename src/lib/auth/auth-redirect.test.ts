import { describe, it, expect } from 'vitest';
import {
  sanitizeRedirectPath,
  DEFAULT_POST_LOGIN_REDIRECT,
} from '@/lib/auth/auth-redirect';

describe('sanitizeRedirectPath', () => {
  it('returns fallback when candidate is null', () => {
    expect(sanitizeRedirectPath(null)).toBe(DEFAULT_POST_LOGIN_REDIRECT);
  });

  it('returns fallback when candidate is undefined', () => {
    expect(sanitizeRedirectPath(undefined)).toBe(DEFAULT_POST_LOGIN_REDIRECT);
  });

  it('returns fallback when candidate is empty string', () => {
    expect(sanitizeRedirectPath('')).toBe(DEFAULT_POST_LOGIN_REDIRECT);
  });

  it('returns the path when it starts with /', () => {
    expect(sanitizeRedirectPath('/assets/hardware')).toBe('/assets/hardware');
  });

  it('returns fallback for protocol-relative URLs (//evil.com)', () => {
    expect(sanitizeRedirectPath('//evil.com/hack')).toBe(
      DEFAULT_POST_LOGIN_REDIRECT
    );
  });

  it('returns fallback for /login paths to prevent redirect loop', () => {
    expect(sanitizeRedirectPath('/login')).toBe(DEFAULT_POST_LOGIN_REDIRECT);
    expect(sanitizeRedirectPath('/login?foo=bar')).toBe(
      DEFAULT_POST_LOGIN_REDIRECT
    );
  });

  it('returns fallback for non-slash-prefixed paths', () => {
    expect(sanitizeRedirectPath('assets/hardware')).toBe(
      DEFAULT_POST_LOGIN_REDIRECT
    );
  });

  it('returns fallback for absolute URLs', () => {
    expect(sanitizeRedirectPath('https://evil.com/hack')).toBe(
      DEFAULT_POST_LOGIN_REDIRECT
    );
  });

  it('preserves query parameters on valid paths', () => {
    expect(sanitizeRedirectPath('/assets?tab=hardware&page=2')).toBe(
      '/assets?tab=hardware&page=2'
    );
  });

  it('trims whitespace from candidate', () => {
    expect(sanitizeRedirectPath('  /dashboard  ')).toBe('/dashboard');
  });

  it('uses custom fallback when provided', () => {
    expect(sanitizeRedirectPath(null, '/custom')).toBe('/custom');
  });

  it('accepts deep nested paths', () => {
    expect(sanitizeRedirectPath('/settings/master-data/brands')).toBe(
      '/settings/master-data/brands'
    );
  });
});
