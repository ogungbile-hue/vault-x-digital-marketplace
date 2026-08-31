import { z } from 'zod';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  badges: z.array(z.string()).default([]),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const CreateProductSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.bigint().positive(),
  currency: z.string().length(3).optional().default('USD'),
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.ACTIVE),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export interface ProductStockSummary {
  productId: string;
  title: string;
  slug: string;
  price: bigint;
  status: ProductStatus;
  availableStock: number;
  reservedStock: number;
  soldStock: number;
  totalStock: number;
}
