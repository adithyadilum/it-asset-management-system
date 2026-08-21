/**
 * Extensions served as static files.
 *
 * Matching *any* dot-suffix — as the proxy previously did with `/\.[a-z0-9]+$/i`
 * — would mean the first application route ending in one, `/reports/export.csv`
 * say, silently skips authentication, the account-disabled gate, and the RBAC
 * check. Only known static types bypass the proxy.
 */
export const STATIC_FILE_EXTENSIONS =
  /\.(?:js|mjs|cjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|txt|xml|webmanifest|json5?)$/i;

/** Static assets, build output, and metadata files that bypass auth. */
export function isPublicAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    STATIC_FILE_EXTENSIONS.test(pathname)
  );
}
