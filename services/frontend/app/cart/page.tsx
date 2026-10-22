"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { type Cart, money, type Product } from "@/lib/types";
import { getUserId } from "@/lib/user";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/cart/${getUserId()}`).then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([c, p]) => {
        setCart(c);
        setProducts(p);
      })
      .catch(() => setError("Couldn't load your cart."));
  }, []);

  const lines = useMemo(
    () =>
      (cart?.items ?? []).map((item) => ({
        ...item,
        product: products.find((p) => p.id === item.product_id),
      })),
    [cart, products],
  );
  // Shown for convenience only. The order service recalculates the total from the product service.
  const estimate = lines.reduce((sum, l) => sum + (l.product?.price_cents ?? 0) * l.quantity, 0);

  async function remove(productId: number) {
    const res = await fetch(`/api/cart/${getUserId()}/items/${productId}`, { method: "DELETE" });
    if (res.ok) setCart(await res.json());
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerEmail: email,
        items: lines.map((l) => ({ productId: l.product_id, quantity: l.quantity })),
      }),
    });
    if (!res.ok) {
      const problem = await res.json().catch(() => ({}));
      setError(problem.detail ?? `Checkout failed (${res.status}).`);
      setBusy(false);
      return;
    }
    const order = await res.json();
    await fetch(`/api/cart/${getUserId()}`, { method: "DELETE" });
    router.push(`/orders/${order.id}`);
  }

  if (!cart) return <p className="muted">{error ?? "Loading…"}</p>;
  if (!lines.length) return <p className="muted">Your cart is empty.</p>;

  return (
    <>
      <h1>Cart</h1>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Qty</th>
              <th className="num">Price</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.product_id}>
                <td>{l.product?.name ?? `Product ${l.product_id}`}</td>
                <td className="num">{l.quantity}</td>
                <td className="num">{l.product ? money(l.product.price_cents * l.quantity) : "—"}</td>
                <td className="num">
                  <button className="ghost" onClick={() => remove(l.product_id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="num" style={{ textAlign: "right" }}>
          Estimated total: <strong>{money(estimate)}</strong>
        </p>
        <form className="row" onSubmit={checkout}>
          <input
            type="email"
            required
            placeholder="Email for your receipt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "Placing…" : "Place order"}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 13 }}>
          Tip: use an address containing <code>+decline</code> to see a failed payment.
        </p>
        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}
