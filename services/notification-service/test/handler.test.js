import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPaymentHandler, PermanentError } from '../src/handler.js';
import { parseBody } from '../src/parse.js';
import { formatMoney, renderPaymentEmail } from '../src/templates.js';

const approved = {
  eventType: 'PaymentProcessed',
  orderId: '4f1c2d1e-0000-4000-8000-000000000001',
  status: 'APPROVED',
  reason: '',
  customerEmail: 'kiki@example.com',
  amountCents: 12498,
  currency: 'EUR',
  items: [{ productId: 1, productName: 'Mechanical Keyboard', quantity: 1, unitPriceCents: 8999 }],
  processedAt: '2026-10-16T12:00:00Z',
};

function fakeMailer() {
  const sent = [];
  return { sent, sendMail: async (mail) => sent.push(mail) };
}

describe('parseBody', () => {
  it('accepts an object, a string and a Buffer', () => {
    const json = JSON.stringify(approved);
    for (const body of [approved, json, Buffer.from(json), new TextEncoder().encode(json)]) {
      assert.equal(parseBody(body).orderId, approved.orderId);
    }
  });
});

describe('renderPaymentEmail', () => {
  it('formats euros the Irish way', () => {
    assert.equal(formatMoney(12498, 'EUR'), '€124.98');
  });

  it('confirms an approved order', () => {
    const email = renderPaymentEmail(approved);
    assert.match(email.subject, /4f1c2d1e is confirmed/);
    assert.match(email.text, /1 x Mechanical Keyboard/);
    assert.match(email.text, /€124\.98/);
  });

  it('explains a declined payment', () => {
    const email = renderPaymentEmail({ ...approved, status: 'DECLINED', reason: 'amount exceeds limit' });
    assert.match(email.subject, /Payment problem/);
    assert.match(email.text, /amount exceeds limit/);
  });

  it('escapes HTML in product names', () => {
    const email = renderPaymentEmail({ ...approved, items: [{ productName: '<script>x</script>', quantity: 1 }] });
    assert.ok(!email.html.includes('<script>'));
  });
});

describe('payment handler', () => {
  it('sends one email to the customer', async () => {
    const mailer = fakeMailer();
    const handle = createPaymentHandler({ mailer, from: 'shop@test' });
    await handle(Buffer.from(JSON.stringify(approved)));
    assert.equal(mailer.sent.length, 1);
    assert.equal(mailer.sent[0].to, 'kiki@example.com');
  });

  it('treats malformed and invalid messages as permanent failures', async () => {
    const handle = createPaymentHandler({ mailer: fakeMailer(), from: 'shop@test' });
    await assert.rejects(handle('not json'), PermanentError);
    await assert.rejects(handle({ ...approved, status: 'MAYBE' }), PermanentError);
  });

  it('lets mail server errors through so the message is retried', async () => {
    const mailer = { sendMail: async () => { throw new Error('SMTP down'); } };
    const handle = createPaymentHandler({ mailer, from: 'shop@test' });
    await assert.rejects(handle(approved), (err) => !(err instanceof PermanentError));
  });
});
