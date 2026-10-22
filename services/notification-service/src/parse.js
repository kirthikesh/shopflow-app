// Service Bus bodies arrive in different shapes depending on the sender's SDK:
// already-parsed JSON, a Buffer/Uint8Array of UTF-8 JSON, or a string.
export function parseBody(body) {
  if (body instanceof Uint8Array) {
    return JSON.parse(Buffer.from(body).toString('utf8'));
  }
  if (typeof body === 'string') {
    return JSON.parse(body);
  }
  if (body && typeof body === 'object') {
    return body;
  }
  throw new Error(`unsupported message body type: ${typeof body}`);
}

export function validatePaymentEvent(event) {
  const problems = [];
  if (event?.eventType !== 'PaymentProcessed') problems.push('eventType must be PaymentProcessed');
  if (!event?.orderId) problems.push('orderId is required');
  if (!event?.customerEmail) problems.push('customerEmail is required');
  if (!['APPROVED', 'DECLINED'].includes(event?.status)) problems.push('status must be APPROVED or DECLINED');
  if (!Number.isInteger(event?.amountCents)) problems.push('amountCents must be an integer');
  return problems;
}
