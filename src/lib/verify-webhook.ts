import crypto from 'crypto';

/**
 * Timing-safe HMAC-SHA256 signature verification for incoming webhooks.
 *
 * @param rawBody - Raw request body string (never parsed JSON)
 * @param signatureHeader - Received signature header (with or without 'sha256=' prefix)
 * @param secret - The shared webhook secret
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // Strip optional 'sha256=' prefix
  const cleanSignature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  // Compute expected HMAC
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf-8')
    .digest('hex');

  // Verify buffer lengths match before timingSafeEqual to avoid throwing
  const signatureBuffer = Buffer.from(cleanSignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length || signatureBuffer.length === 0) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

/**
 * Helper to generate an HMAC signature (for tests & outbound webhooks)
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf-8').digest('hex');
}
