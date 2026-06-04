import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_SANDBOX !== 'true') {
    return NextResponse.json({ error: 'Sandbox mode not enabled' }, { status: 403 });
  }

  try {
    const { role = 'GlobalAdmin', email } = await req.json();

    let userEmail = email;
    if (!userEmail) {
      // Map roles to standard test emails
      const userMap: Record<string, string> = {
        GlobalAdmin: 'admin@tiqri.test',
        ITOperator: 'it@tiqri.test',
        Employee: 'employee@tiqri.test',
        FinanceAuditor: 'finance@tiqri.test',
      };
      userEmail = userMap[role] || userMap['Employee'];
    }

    let dbUser = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!dbUser) {
      // Create user if not exists for tests, handle parallel inserts
      const inserted = await db.insert(users).values({
        email: userEmail,
        name: `${role} Test User`,
        role: role as 'GlobalAdmin' | 'Employee' | 'ITOperator' | 'FinanceAuditor',
        isActive: true,
      }).onConflictDoUpdate({
        target: users.email,
        set: { role: role as 'GlobalAdmin' | 'Employee' | 'ITOperator' | 'FinanceAuditor', isActive: true }
      }).returning();
      dbUser = inserted[0];
    }

    const token = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      accessTokenExpires: Date.now() + 1000 * 60 * 60 * 24, // 1 day
    };

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Missing NEXTAUTH_SECRET' }, { status: 500 });
    }

    // Encrypt the JWT token mimicking NextAuth's internal logic
    const encodedToken = await encode({
      token,
      secret,
    });

    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token';

    const cookieStore = await cookies();
    cookieStore.set(cookieName, encodedToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({ success: true, user: dbUser, cookieName, token: encodedToken });
  } catch (error: unknown) {
    console.error('Failed to create test session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
