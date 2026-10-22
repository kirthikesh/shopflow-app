const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function formatMoney(cents, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(cents / 100);
}

export function renderPaymentEmail(event) {
  const shortId = event.orderId.slice(0, 8);
  const total = formatMoney(event.amountCents, event.currency || 'EUR');
  const items = Array.isArray(event.items) ? event.items : [];

  if (event.status === 'APPROVED') {
    const lines = items.map((i) => `${i.quantity} x ${i.productName}`);
    return {
      subject: `Your ShopFlow order ${shortId} is confirmed`,
      text: [`Thanks for your order!`, '', ...lines, '', `Total paid: ${total}`, `Order: ${event.orderId}`].join('\n'),
      html:
        `<h2>Thanks for your order!</h2>` +
        (lines.length ? `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : '') +
        `<p><strong>Total paid:</strong> ${escapeHtml(total)}</p>` +
        `<p style="color:#888">Order ${escapeHtml(event.orderId)}</p>`,
    };
  }

  const reason = event.reason || 'the payment was declined';
  return {
    subject: `Payment problem with ShopFlow order ${shortId}`,
    text: `We couldn't take payment of ${total} for order ${event.orderId}: ${reason}.\nNo money has been taken.`,
    html:
      `<h2>We couldn't take your payment</h2>` +
      `<p>Payment of ${escapeHtml(total)} for order ${escapeHtml(event.orderId)} failed: ${escapeHtml(reason)}.</p>` +
      `<p>No money has been taken.</p>`,
  };
}
