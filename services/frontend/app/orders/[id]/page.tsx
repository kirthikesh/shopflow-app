"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { money, type Order } from "@/lib/types";

const LABELS: Record<Order["status"], string> = {
  PENDING_PAYMENT: "Waiting for payment…",
  PAID: "Paid — confirmation email sent",
  PAYMENT_FAILED: "Payment failed",
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment happens asynchronously (order → Service Bus → payment service → Service Bus → order),
  // so poll until the order leaves PENDING_PAYMENT.
  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    async function poll() {
      const res = await fetch(`/api/orders/${id}`);
      if (stopped) return;
      if (!res.ok) {
        setError(res.status === 404 ? "Order not found." : "Couldn't load the order.");
        return;
      }
      const data: Order = await res.json();
      setOrder(data);
      if (data.status === "PENDING_PAYMENT" && ++attempts < 30) setTimeout(poll, 1500);
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Order {order.id.slice(0, 8)}</h1>
      <div className="panel">
        <p className={`status ${order.status}`}>{LABELS[order.status]}</p>
        {order.statusReason && <p className="muted">Reason: {order.statusReason}</p>}
        <table>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.productId}>
                <td>
                  {i.quantity} × {i.productName}
                </td>
                <td className="num">{money(i.unitPriceCents * i.quantity, order.currency)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td className="num">
                <strong>{money(order.totalCents, order.currency)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 13 }}>
          Receipt sent to {order.customerEmail}. Locally, open Mailpit at localhost:8025 to read it.
        </p>
        <Link href="/">Continue shopping</Link>
      </div>
    </>
  );
}
