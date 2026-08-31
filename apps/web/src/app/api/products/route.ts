import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@app/database';
import { StockStatus } from '@app/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    const whereClause: any = { isActive: true };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        stockItems: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithStats = products.map((prod) => {
      let availableStock = 0;
      let reservedStock = 0;
      let soldStock = 0;

      for (const item of prod.stockItems) {
        if (item.status === StockStatus.AVAILABLE) availableStock++;
        else if (item.status === StockStatus.RESERVED) reservedStock++;
        else if (item.status === StockStatus.SOLD) soldStock++;
      }

      return {
        id: prod.id,
        categoryId: prod.categoryId,
        category: prod.category,
        title: prod.title,
        slug: prod.slug,
        description: prod.description,
        price: prod.price.toString(),
        currency: prod.currency,
        status: prod.status,
        availableStock,
        reservedStock,
        soldStock,
        totalStock: prod.stockItems.length,
      };
    });

    return NextResponse.json({ success: true, products: productsWithStats });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
