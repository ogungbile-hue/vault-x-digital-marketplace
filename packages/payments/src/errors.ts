export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

export class InvalidSignatureError extends WebhookError {
  constructor(provider: string) {
    super(`Invalid cryptographic webhook signature for provider: ${provider}`);
    this.name = 'InvalidSignatureError';
  }
}

export class DuplicateWebhookError extends WebhookError {
  public externalEventId: string;

  constructor(provider: string, externalEventId: string) {
    super(`Duplicate webhook event ignored for ${provider} with eventId: ${externalEventId}`);
    this.name = 'DuplicateWebhookError';
    this.externalEventId = externalEventId;
  }
}
