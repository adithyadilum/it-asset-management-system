import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ENABLE_SANDBOX: process.env.NEXT_PUBLIC_ENABLE_SANDBOX
  });
}
