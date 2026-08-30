import crypto from 'node:crypto';

export function calculateHmacSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

export function verifyHmacSignature(
  body: string,
  secret: string,
  receivedSignature: string
): boolean {
  const expected = calculateHmacSignature(body, secret);
  const received = receivedSignature.trim();

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
