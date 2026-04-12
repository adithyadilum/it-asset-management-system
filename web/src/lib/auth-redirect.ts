export const DEFAULT_POST_LOGIN_REDIRECT = "/dashboard";

export function sanitizeRedirectPath(
    candidate: string | null | undefined,
    fallback = DEFAULT_POST_LOGIN_REDIRECT,
) {
    // Fallback when no redirect target is provided.
    if (!candidate) {
        return fallback;
    }

    const value = candidate.trim();

    // Allow only same-origin internal paths.
    if (!value.startsWith("/")) {
        return fallback;
    }

    // Prevent protocol-relative redirects and login loops.
    if (value.startsWith("//") || value.startsWith("/login")) {
        return fallback;
    }

    return value;
}