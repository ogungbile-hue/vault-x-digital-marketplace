export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class UnbalancedLedgerError extends LedgerError {
  public totalDebits: bigint;
  public totalCredits: bigint;

  constructor(totalDebits: bigint, totalCredits: bigint) {
    super(`Unbalanced ledger transaction: total debits (${totalDebits}) does not equal total credits (${totalCredits}).`);
    this.name = 'UnbalancedLedgerError';
    this.totalDebits = totalDebits;
    this.totalCredits = totalCredits;
  }
}

export class InsufficientBalanceError extends LedgerError {
  public available: bigint;
  public required: bigint;

  constructor(available: bigint, required: bigint) {
    super(`Insufficient wallet balance: available (${available}), required (${required}).`);
    this.name = 'InsufficientBalanceError';
    this.available = available;
    this.required = required;
  }
}

export class DuplicateTransactionError extends LedgerError {
  constructor(idempotencyKey: string) {
    super(`Transaction with idempotency key '${idempotencyKey}' has already been processed.`);
    this.name = 'DuplicateTransactionError';
  }
}
