import {
  CreateCategoryInput,
  CreateProductInput,
  ProductStockSummary,
  StockStatus,
} from '@app/types';
import { prisma, PrismaTransaction } from '@app/database';

export class CatalogService {
  /**
   * Creates a new product category with metadata badges (e.g. ['USA', 'Aged', '2FA']).
   */
  public static async createCategory(
    input: CreateCategoryInput,
    clientOrTx: PrismaTransaction = prisma
  ) {
    return clientOrTx.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        icon: input.icon,
        badges: input.badges,
      },
    });
  }

  /**
   * Lists all categories with their product count.
   */
  public static async listCategories(clientOrTx: PrismaTransaction = prisma) {
    return clientOrTx.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a new digital SKU product under an optional category.
   */
  public static async createProduct(
    input: CreateProductInput,
    clientOrTx: PrismaTransaction = prisma
  ) {
    return clientOrTx.product.create({
      data: {
        categoryId: input.categoryId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        price: input.price,
        currency: input.currency || 'USD',
        status: input.status,
      },
    });
  }

  /**
   * Computes dynamic real-time stock status counts (AVAILABLE, RESERVED, SOLD) for a product.
   */
  public static async getProductWithStockSummary(
    productId: string,
    clientOrTx: PrismaTransaction = prisma
  ): Promise<ProductStockSummary> {
    const product = await clientOrTx.product.findUnique({
      where: { id: productId },
      include: {
        stockItems: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    let availableStock = 0;
    let reservedStock = 0;
    let soldStock = 0;

    for (const item of product.stockItems) {
      if (item.status === StockStatus.AVAILABLE) availableStock++;
      else if (item.status === StockStatus.RESERVED) reservedStock++;
      else if (item.status === StockStatus.SOLD) soldStock++;
    }

    return {
      productId: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      status: product.status as any,
      availableStock,
      reservedStock,
      soldStock,
      totalStock: product.stockItems.length,
    };
  }
}
