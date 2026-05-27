import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { db } from '@/db';
import { notificationLogs } from '@/db/schema';

export async function POST(req: NextRequest) {
  try {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentKey || !nextKey) {
      return NextResponse.json(
        { error: 'Signing keys misconfigured' },
        { status: 500 }
      );
    }

    const signature = req.headers.get('Upstash-Signature');
    if (!signature)
      return NextResponse.json(
        { error: 'Missing Upstash signature' },
        { status: 401 }
      );

    const bodyText = await req.text();
    const receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });
    const isValid = await receiver
      .verify({ signature, body: bodyText, url: req.url })
      .catch(() => false);
    if (!isValid)
      return NextResponse.json(
        { error: 'Invalid Upstash signature' },
        { status: 401 }
      );

    const payload = JSON.parse(bodyText || '{}');

    // Minimal handler: record that the email job was received.
    await db.insert(notificationLogs).values({
      notificationId: payload.notificationId ?? null,
      userId: payload.userId ?? null,
      targetUrl: payload.targetUrl ?? null,
      eventType: payload.eventType ?? 'WARRANTY_EXPIRY',
      channel: 'email',
      status: 'sent',
      sentAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Email QStash handler failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
