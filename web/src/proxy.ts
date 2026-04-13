import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { jwtVerify } from "jose";

import { DEFAULT_POST_LOGIN_REDIRECT, sanitizeRedirectPath } from "@/lib/auth-redirect";
import { getJwtSecretKey } from "@/lib/jwt";

const SESSION_COOKIE_NAME = "session_token";

const getDbClient = () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not configured");
    }

    return neon(databaseUrl);
};

async function isSessionActive(sessionId: string) {
    const client = getDbClient();
    const result = (await client`
      SELECT EXISTS (
        SELECT 1
        FROM sessions
        WHERE token_id = ${sessionId}
          AND revoked_at IS NULL
          AND expires_at > NOW()
      ) AS is_active
        `) as Array<{ is_active: boolean }>;

    return result[0]?.is_active === true;
}

async function verifyTokenAndSession(token: string) {
    const verified = await jwtVerify(token, getJwtSecretKey());
    const payload = verified.payload as { role?: string; sid?: string };

    if (typeof payload.sid !== "string" || payload.sid.length === 0) {
        throw new Error("Session id is missing from token");
    }

    const active = await isSessionActive(payload.sid);

    if (!active) {
        throw new Error("Session is revoked or expired");
    }

    return payload;
}

function getLoginRedirectResponse(request: NextRequest) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the originally requested path so login can send the user back.
    const requestedPath = sanitizeRedirectPath(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
        DEFAULT_POST_LOGIN_REDIRECT,
    );

    loginUrl.searchParams.set("redirectTo", requestedPath);

    return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const { pathname } = request.nextUrl;
    const isProtectedRoute = pathname !== "/login";
    const isDashboardRoute = pathname.startsWith("/dashboard");
    const isLoginRoute = pathname === "/login";

    // If the user is trying to access a protected route without a token, kick them to login.
    if (!token && isProtectedRoute) {
        return getLoginRedirectResponse(request);
    }

    let payload: { role?: string } | null = null;

    if (token) {
        try {
            payload = await verifyTokenAndSession(token);
        } catch {
            // Invalid token/session should not bounce on /login.
            const response = isProtectedRoute ? getLoginRedirectResponse(request) : NextResponse.next();
            response.cookies.delete(SESSION_COOKIE_NAME);
            return response;
        }
    }

    // RBAC: Prevent an Employee from accessing the Admin panel
    if (isDashboardRoute && payload?.role !== "Admin" && pathname.startsWith("/dashboard/admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If the user is already logged in and tries to visit /login, skip it.
    if (token && isLoginRoute) {
        // Respect a preserved redirect target when an authenticated user hits /login.
        const redirectTo = sanitizeRedirectPath(
            request.nextUrl.searchParams.get("redirectTo"),
            DEFAULT_POST_LOGIN_REDIRECT,
        );

        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.next();
}

// Only run this proxy on protected routes and /login.
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|login|.*\\..*).*)", "/login"],
};