import { NextRequest, NextResponse } from 'next/server';
import { WebhookProvider } from '@app/types';
import { WebhookService } from '@app/payments';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || undefined;
    const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_paystack_secret_12345';

    const result = await WebhookService.processDepositWebhook(
      WebhookProvider.PAYSTACK,
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
      { received: false, error: error.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
