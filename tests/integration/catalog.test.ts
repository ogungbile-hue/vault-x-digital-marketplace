import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { ProductStatus, StockStatus } from '@app/types';
import { CatalogService } from '@app/inventory';

describe('Catalog & Dynamic SKU Stock Aggregation Service', () => {
  let mockCategories: any[] = [];
  let mockProducts: any[] = [];
  let mockStockItems: any[] = [];
  let mockTx: any;

  beforeEach(() => {
    mockCategories = [];
    mockProducts = [];
    mockStockItems = [];

    mockTx = {
      category: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const cat = {
            id: `cat-${crypto.randomUUID()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockCategories.push(cat);
          return cat;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return mockCategories.map((c) => ({
            ...c,
            _count: {
              products: mockProducts.filter((p) => p.categoryId === c.id).length,
            },
          }));
        }),
      },
      product: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const prod = {
            id: `prod-${crypto.randomUUID()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockProducts.push(prod);
          return prod;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          const prod = mockProducts.find((p) => p.id === where.id);
          if (!prod) return null;
          return {
            ...prod,
            stockItems: mockStockItems.filter((s) => s.productId === prod.id),
          };
        }),
      },
    };
  });

  it('should create categories with metadata badges and list them with product counts', async () => {
    const category = await CatalogService.createCategory(
      {
        name: 'Streaming & Media Accounts',
        slug: 'streaming-media',
        icon: 'play-circle',
        badges: ['Instant Delivery', 'Warranty 30D', 'Auto-Replace'],
      },
      mockTx
    );

    expect(category.id).toBeDefined();
    expect(category.name).toBe('Streaming & Media Accounts');
    expect(category.badges).toEqual(['Instant Delivery', 'Warranty 30D', 'Auto-Replace']);

    // Create a product under this category
    await CatalogService.createProduct(
      {
        categoryId: category.id,
        title: 'Netflix 4K UHD 1-Month',
        slug: 'netflix-4k-uhd-1m',
        price: 499n, // $4.99
        status: ProductStatus.ACTIVE,
      },
      mockTx
    );

    const listed = await CatalogService.listCategories(mockTx);
    expect(listed).toHaveLength(1);
    expect(listed[0]._count.products).toBe(1);
  });

  it('should dynamically aggregate inventory counts (AVAILABLE, RESERVED, SOLD) for a product SKU', async () => {
    const product = await CatalogService.createProduct(
      {
        title: 'Windows 11 Professional License',
        slug: 'windows-11-pro',
        price: 1999n,
        status: ProductStatus.ACTIVE,
      },
      mockTx
    );

    // Seed stock items with different lifecycle statuses
    mockStockItems.push(
      { id: 's1', productId: product.id, status: StockStatus.AVAILABLE },
      { id: 's2', productId: product.id, status: StockStatus.AVAILABLE },
      { id: 's3', productId: product.id, status: StockStatus.AVAILABLE },
      { id: 's4', productId: product.id, status: StockStatus.RESERVED },
      { id: 's5', productId: product.id, status: StockStatus.SOLD },
      { id: 's6', productId: product.id, status: StockStatus.SOLD }
    );

    const summary = await CatalogService.getProductWithStockSummary(product.id, mockTx);

    expect(summary.productId).toBe(product.id);
    expect(summary.availableStock).toBe(3);
    expect(summary.reservedStock).toBe(1);
    expect(summary.soldStock).toBe(2);
    expect(summary.totalStock).toBe(6);
  });
});
