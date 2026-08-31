import { NextRequest, NextResponse } from 'next/server';
import { WebhookProvider } from '@app/types';
import { WebhookService } from '@app/payments';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-crypto-signature') || req.headers.get('x-signature') || undefined;
    const secretKey = process.env.CRYPTO_WEBHOOK_SECRET || 'crypto_processor_secret_67890';

    const result = await WebhookService.processDepositWebhook(
      WebhookProvider.CRYPTO_GENERIC,
      rawBody,
      signature,
      secretKey
    );

    return NextResponse.json({
      received: true,
      status: result.status,
      eventId: result.eventId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { received: false, error: error.message || 'Crypto webhook processing failed' },
      { status: 400 }
    );
  }
}
