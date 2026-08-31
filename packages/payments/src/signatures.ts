import crypto from 'node:crypto';

/**
 * Performs timing-safe comparison between two hex strings to prevent side-channel timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');

  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Computes Paystack HMAC SHA-512 signature.
 */
export function computePaystackSignature(rawBody: string, secretKey: string): string {
  return crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
}

/**
 * Verifies Paystack webhook signature from x-paystack-signature header.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | undefined,
  secretKey: string
): boolean {
  if (!signature || !secretKey) {
    return false;
  }
  const expected = computePaystackSignature(rawBody, secretKey);
  return timingSafeCompare(signature, expected);
}

/**
 * Computes generic Crypto / USDT webhook HMAC SHA-256 signature.
 */
export function computeCryptoWebhookSignature(rawBody: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');
}

/**
 * Verifies generic Crypto / USDT webhook signature.
 */
export function verifyCryptoWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secretKey: string
): boolean {
  if (!signature || !secretKey) {
    return false;
  }
  const expected = computeCryptoWebhookSignature(rawBody, secretKey);
  return timingSafeCompare(signature, expected);
}
