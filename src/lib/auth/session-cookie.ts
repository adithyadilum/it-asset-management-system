/** Base names NextAuth uses for the session cookie, secure and plain variants. */
export const SESSION_COOKIE_BASE_NAMES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
] as const;

/**
 * Every session cookie present, including chunks.
 *
 * NextAuth splits a session cookie over 4096 bytes into `<name>.0`, `<name>.1`,
 * ... and this one carries three Keycloak tokens, so it routinely is split.
 * Code that deleted only the unchunked name therefore deleted nothing at all on
 * exactly the sessions most likely to be broken.
 */
export function sessionCookieNamesToClear(presentNames: readonly string[]) {
  return presentNames.filter((name) =>
    SESSION_COOKIE_BASE_NAMES.some(
      (base) => name === base || name.startsWith(`${base}.`)
    )
  );
}
