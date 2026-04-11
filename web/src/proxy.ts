import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const getSecretKey = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function proxy(request: NextRequest) {
    const token = request.cookies.get("session_token")?.value;
    const { pathname } = request.nextUrl;

    //If the user trying to access the dashboard without a token, kick them to login
    if (!token && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If the user have a token, verify it's real and check their role
    if (token && pathname.startsWith("/dashboard")) {
        try {
            const verified = await jwtVerify(token, getSecretKey());
            const payload = verified.payload as { role: string };

            // RBAC: Prevent an Employee from accessing the Admin panel
            if (payload.role !== "Admin" && pathname.startsWith("/dashboard/admin")) {
                // Send them back to the normal employee dashboard
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }
        } catch {
            // If the token is fake or expired, clear it and kick them out.
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("session_token");
            return response;
        }
    }

    // If the user are already logged in and try to visit /login, skip it
    if (token && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// Optimization: Only run this middleware on specific routes
export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};