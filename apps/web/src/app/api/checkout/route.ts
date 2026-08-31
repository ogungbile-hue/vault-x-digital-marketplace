import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { CheckoutService } from '@app/inventory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || 'user-default-buyer';
    const items = body.items || [];
    const idempotencyKey = body.idempotencyKey || req.headers.get('Idempotency-Key') || crypto.randomUUID();

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'WebBrowser/1.0';

    const result = await CheckoutService.executeInstantCheckout(
      {
        userId,
        items,
        idempotencyKey,
      },
      {
        ipAddress: clientIp,
        userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      order: {
        ...result,
        totalAmount: result.totalAmount.toString(),
        items: result.items.map((i) => ({
          ...i,
          price: i.price.toString(),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Checkout execution failed' },
      { status: 400 }
    );
  }
}
