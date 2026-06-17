import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: serverEnv.DATABASE_URL,
    NODE_ENV: serverEnv.NODE_ENV,
    NEXT_PUBLIC_ENABLE_SANDBOX: clientEnv.NEXT_PUBLIC_ENABLE_SANDBOX
  });
}
