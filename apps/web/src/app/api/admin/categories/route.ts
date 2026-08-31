import { NextRequest, NextResponse } from 'next/server';
import { CatalogService } from '@app/inventory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = await CatalogService.createCategory({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: body.icon || 'tag',
      badges: body.badges || [],
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create category' },
      { status: 400 }
    );
  }
}
