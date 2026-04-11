import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "session_token";

const getSecretKey = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }

    return new TextEncoder().encode(secret);
};

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
    const verified = await jwtVerify(token, getSecretKey());
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

export async function proxy(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const { pathname } = request.nextUrl;
    const isDashboardRoute = pathname.startsWith("/dashboard");
    const isLoginRoute = pathname === "/login";

    //If the user trying to access the dashboard without a token, kick them to login
    if (!token && isDashboardRoute) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    let payload: { role?: string } | null = null;

    if (token) {
        try {
            payload = await verifyTokenAndSession(token);
        } catch {
            // Invalid token/session should not bounce on /login.
            const response = isDashboardRoute
                ? NextResponse.redirect(new URL("/login", request.url))
                : NextResponse.next();
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
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// Optimization: Only run this middleware on specific routes
export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};