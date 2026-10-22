import { parseBody, validatePaymentEvent } from './parse.js';
import { renderPaymentEmail } from './templates.js';

export class PermanentError extends Error {}

// Returns an async function that handles one message body.
// Throws PermanentError for messages that can never succeed (dead-letter them),
// and other errors for transient failures (abandon, Service Bus retries).
export function createPaymentHandler({ mailer, from, metrics, log }) {
  return async function handlePaymentEvent(body) {
    let event;
    try {
      event = parseBody(body);
    } catch (err) {
      throw new PermanentError(`malformed message: ${err.message}`);
    }

    const problems = validatePaymentEvent(event);
    if (problems.length) {
      throw new PermanentError(`invalid PaymentProcessed event: ${problems.join(', ')}`);
    }

    const email = renderPaymentEmail(event);
    await mailer.sendMail({ from, to: event.customerEmail, ...email });

    metrics?.emailsSent.inc({ status: event.status });
    log?.info({ msg: 'email sent', orderId: event.orderId, status: event.status });
    return email;
  };
}
