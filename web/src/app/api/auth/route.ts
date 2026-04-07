// src/app/api/auth/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { AuthErrorResponse, LoginRequest, LoginSuccessResponse } from '@/types/auth';

// Adjust these paths based on where created the db instance and schema
import { db } from '@/db';
import { users } from '@/db/schema';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LoginRequest>;
    const { email, password } = body;

    // 1. Basic Validation
    if (!email || !password) {
      return NextResponse.json<AuthErrorResponse>(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 2. Query the real database using Drizzle
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = dbUsers[0];

    // 3. Check if a user with that email was found
    if (!user) {
      return NextResponse.json<AuthErrorResponse>(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 4. Securely verify the password against the hashed password in the DB
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      const response: LoginSuccessResponse = {
        success: true,
        message: 'Login successful',
        user: {
          // Only return safe data to the client
          id: user.id,
          email: user.email,
        },
      };

      return NextResponse.json<LoginSuccessResponse>(response, { status: 200 });
    } else {
      return NextResponse.json<AuthErrorResponse>(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error("Database Login Error:", error);
    return NextResponse.json<AuthErrorResponse>(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}