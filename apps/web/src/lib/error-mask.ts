import { NextResponse } from 'next/server';

export interface MaskedErrorResponse {
  success: false;
  error: string;
  code?: string;
}

const KNOWN_SAFE_ERROR_PREFIXES = [
  'Insufficient stock',
  'Insufficient wallet balance',
  'Invalid cryptographic webhook signature',
  'Duplicate webhook event',
  'Order not found',
  'Product not found',
  'Transaction with idempotency key',
  'Unbalanced ledger transaction',
];

/**
 * Sanitizes exceptions to prevent internal stack traces, DB connection strings,
 * or cryptographic keys from leaking into client HTTP responses.
 */
export function maskError(error: any, statusCode: number = 500): NextResponse<MaskedErrorResponse> {
  const rawMessage = error instanceof Error ? error.message : String(error);

  // Check if this is a known safe business/domain error
  const isSafeDomainError = KNOWN_SAFE_ERROR_PREFIXES.some((prefix) =>
    rawMessage.startsWith(prefix)
  );

  if (isSafeDomainError) {
    return NextResponse.json(
      {
        success: false,
        error: rawMessage,
        code: error.name || 'DOMAIN_ERROR',
      },
      { status: statusCode === 500 ? 400 : statusCode }
    );
  }

  // Log internal error detail securely on server
  console.error('[CRITICAL_INTERNAL_ERROR]:', error);

  // Return sanitized generic message to client
  return NextResponse.json(
    {
      success: false,
      error: 'An internal server error occurred. Please try again or contact support.',
      code: 'INTERNAL_ERROR',
    },
    { status: statusCode }
  );
}
