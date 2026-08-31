import { NextRequest, NextResponse } from 'next/server';
import { RevealService } from '@app/inventory';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-default-buyer';

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'WebBrowser/1.0';

    const revealedItems = await RevealService.revealOrderCredentials(
      userId,
      orderId,
      {
        ipAddress: clientIp,
        userAgent,
      }
    );

    return NextResponse.json({
      success: true,
      orderId,
      items: revealedItems.map((item) => ({
        ...item,
        price: item.price.toString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reveal order credentials' },
      { status: 403 }
    );
  }
}
