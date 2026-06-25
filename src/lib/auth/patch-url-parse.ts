import { createRequire } from 'node:module';
import type { parse as ParseFn } from 'node:url';

declare global {
  var __codexPatchedUrlParse: boolean | undefined;
}

const require = createRequire(import.meta.url);
const nodeUrl = require('node:url') as {
  parse: typeof ParseFn;
};

const legacyParse = nodeUrl.parse;

function hasProtocol(input: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input);
}

function toLegacyLikeUrl(input: string): Record<string, unknown> {
  const absolute = hasProtocol(input);
  const parsed = absolute ? new URL(input) : new URL(input, 'http://localhost');
  const relativePath = !absolute && !input.startsWith('//');
  const auth =
    parsed.username || parsed.password
      ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}`
      : null;

  return {
    auth,
    hash: parsed.hash || null,
    host: relativePath ? null : parsed.host || null,
    hostname: relativePath ? null : parsed.hostname || null,
    href: absolute ? parsed.href : input,
    path: `${parsed.pathname}${parsed.search}` || null,
    pathname: parsed.pathname || null,
    port: relativePath ? null : parsed.port || null,
    protocol: absolute ? parsed.protocol : null,
    query: parsed.search ? parsed.search.slice(1) : null,
    search: parsed.search || null,
    slashes: absolute || input.startsWith('//'),
  };
}

if (!globalThis.__codexPatchedUrlParse) {
  const safeParse = ((input: unknown, parseQueryString?: boolean, slashesDenoteHost?: boolean) => {
    if (typeof input !== 'string') {
      return legacyParse(
        input as string,
        parseQueryString as boolean,
        slashesDenoteHost
      );
    }

    try {
      const parsed = toLegacyLikeUrl(input);
      if (parseQueryString && typeof parsed.query === 'string') {
        parsed.query = Object.fromEntries(new URLSearchParams(parsed.query));
      }
      return parsed;
    } catch {
      return legacyParse(input, parseQueryString as boolean, slashesDenoteHost);
    }
  }) as typeof ParseFn;

  nodeUrl.parse = safeParse;
  globalThis.__codexPatchedUrlParse = true;
}
