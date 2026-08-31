import { NextResponse } from 'next/server';
import { prisma } from '@app/database';

export async function GET() {
  try {
    const webhooks = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      webhooks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch webhook events' },
      { status: 500 }
    );
  }
}
