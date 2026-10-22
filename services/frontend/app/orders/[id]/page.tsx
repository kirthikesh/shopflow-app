"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductArt } from "@/components/ProductArt";
import { useCart } from "@/lib/cart-context";
import { money, type Order } from "@/lib/types";

type StepState = "done" | "active" | "failed" | "waiting";

const POLL_MS = 1000;
const MAX_POLLS = 60;

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { products, setQuantity } = useCart();
  const [restoring, setRestoring] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  // Payment is asynchronous: order-service → Service Bus → payment-service → Service Bus → order-service.
  // Poll until the order leaves PENDING_PAYMENT.
  useEffect(() => {
    let stopped = false;
    let polls = 0;
    async function poll() {
      const res = await fetch(`/api/orders/${id}`).catch(() => null);
      if (stopped) return;
      if (!res || !res.ok) {
        setError(res?.status === 404 ? "We couldn't find that order." : "We couldn't load this order. Refresh to try again.");
        return;
      }
      const data: Order = await res.json();
      setOrder(data);
      if (data.status === "PENDING_PAYMENT") {
        if (++polls < MAX_POLLS) setTimeout(poll, POLL_MS);
        else setGaveUp(true);
      }
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="empty">
        <h1>{error}</h1>
        <Link href="/" className="btn">
          Back to the shop
        </Link>
      </div>
    );
  }
  if (!order) return <div className="order order--skeleton" aria-busy="true" />;

  const paid = order.status === "PAID";
  const failed = order.status === "PAYMENT_FAILED";
  const settled = paid || failed;
  const seconds = ((Date.parse(order.updatedAt) - Date.parse(order.createdAt)) / 1000).toFixed(1);

  const steps: { title: string; detail: string; state: StepState }[] = [
    {
      title: "Order placed",
      detail: `Prices checked and order saved at ${new Date(order.createdAt).toLocaleTimeString("en-IE")}.`,
      state: "done",
    },
    {
      title: failed ? "Payment declined" : paid ? "Payment approved" : "Taking payment",
      detail: failed
        ? `${capitalise(order.statusReason ?? "The payment was declined")}. No money has been taken.`
        : paid
          ? `${money(order.totalCents, order.currency)} approved in ${seconds} seconds.`
          : gaveUp
            ? "This is taking longer than usual. Check that payment-service is running."
            : "Waiting for the payment service to respond.",
      state: failed ? "failed" : paid ? "done" : "active",
    },
    {
      title: failed ? "Customer notified" : "Receipt emailed",
      detail: failed
        ? `We emailed ${order.customerEmail} about the failed payment.`
        : paid
          ? `Sent to ${order.customerEmail}.`
          : "Sent once payment is complete.",
      state: settled ? "done" : "waiting",
    },
  ];

  // The cart was emptied when the order was placed. After a declined payment,
  // put the same items back so the customer can try again.
  async function restoreCart() {
    if (!order || !products) return;
    setRestoring(true);
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) await setQuantity(product, item.quantity);
    }
    router.push("/cart");
  }

  return (
    <div className="order">
      <header className="order__head">
        <h1>
          {failed ? "Your payment didn't go through." : paid ? "Thanks, your order is confirmed." : "Placing your order…"}
        </h1>
        <p className="muted">Order {order.id.slice(0, 8).toUpperCase()}</p>
      </header>

      <ol className={`tracker ${failed ? "tracker--failed" : ""}`} aria-label="Order progress">
        {steps.map((s) => (
          <li key={s.title} className={`step step--${s.state}`} aria-current={s.state === "active" ? "step" : undefined}>
            <span className="step__marker" aria-hidden="true">
              {s.state === "done" && <CheckIcon />}
              {s.state === "failed" && <CrossIcon />}
            </span>
            <div>
              <p className="step__title">{s.title}</p>
              <p className="step__detail">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="order__body">
        <section className="receipt" aria-labelledby="receipt-title">
          <h2 id="receipt-title">{failed ? "Order details" : "Receipt"}</h2>
          <ul className="receipt__lines">
            {order.items.map((i) => {
              const product = products?.find((p) => p.id === i.productId);
              return (
                <li key={i.productId}>
                  <span className="receipt__art" data-category={product?.category} aria-hidden="true">
                    {product && <ProductArt sku={product.sku} />}
                  </span>
                  <span className="receipt__name">
                    {i.productName}
                    <span className="muted"> × {i.quantity}</span>
                  </span>
                  <span className="price">{money(i.unitPriceCents * i.quantity, order.currency)}</span>
                </li>
              );
            })}
          </ul>
          <p className="receipt__total">
            <span>Total</span>
            <span className="price">{money(order.totalCents, order.currency)}</span>
          </p>
        </section>

        <details className="behind">
          <summary>How this order was processed</summary>
          <ol>
            <li>
              <strong>order-service</strong> (Java) re-priced each item from <strong>product-service</strong>, saved the
              order and published an <code>OrderCreated</code> event to the <code>order-created</code> queue.
            </li>
            <li>
              <strong>payment-service</strong> (Go) consumed it and published <code>PaymentProcessed</code> to the{" "}
              <code>payment-events</code> topic.
            </li>
            <li>
              Two subscriptions received that event: <strong>order-service</strong> updated the status and{" "}
              <strong>notification-service</strong> (Node.js) sent the email.
            </li>
          </ol>
          <p className="muted small">
            Running locally? Open <a href="http://localhost:8025">Mailpit</a> to read the email.
          </p>
        </details>
      </div>

      <div className="order__actions">
        {failed && (
          <button className="btn" onClick={restoreCart} disabled={restoring || !products}>
            {restoring ? "Restoring your cart…" : "Put these items back in my cart"}
          </button>
        )}
        <Link href="/" className="btn btn--quiet">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
