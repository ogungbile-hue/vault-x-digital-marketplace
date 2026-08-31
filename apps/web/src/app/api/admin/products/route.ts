import { NextRequest, NextResponse } from 'next/server';
import { CatalogService } from '@app/inventory';
import { ProductStatus } from '@app/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await CatalogService.createProduct({
      categoryId: body.categoryId || undefined,
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: body.description,
      price: BigInt(body.priceMinor || Math.round(Number(body.price || 0) * 100)),
      currency: body.currency || 'USD',
      status: body.status === 'DRAFT' ? ProductStatus.DRAFT : ProductStatus.ACTIVE,
    });

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        price: product.price.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 400 }
    );
  }
}
