export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}

export class InsufficientStockError extends InventoryError {
  public productId: string;
  public requested: number;
  public available: number;

  constructor(productId: string, requested: number, available: number) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, but only ${available} available.`);
    this.name = 'InsufficientStockError';
    this.productId = productId;
    this.requested = requested;
    this.available = available;
  }
}

export class OrderNotFoundError extends InventoryError {
  constructor(orderId: string) {
    super(`Order ${orderId} not found or access denied.`);
    this.name = 'OrderNotFoundError';
  }
}
