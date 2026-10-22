"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ProductArt } from "@/components/ProductArt";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/lib/cart-context";
import { money } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { cart, cartError, products, setQuantity, clear } = useCart();
  const [email, setEmail] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      (cart?.items ?? []).map((item) => ({
        ...item,
        product: products?.find((p) => p.id === item.product_id),
      })),
    [cart, products],
  );
  // For display only. order-service recalculates every price from product-service.
  const subtotal = lines.reduce((sum, l) => sum + (l.product?.price_cents ?? 0) * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerEmail: email,
        items: lines.map((l) => ({ productId: l.product_id, quantity: l.quantity })),
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const problem = res ? await res.json().catch(() => ({})) : {};
      setError(
        res?.status === 503
          ? "Orders can't be placed right now because a service is unavailable. Try again in a minute."
          : (problem.detail ?? "Your order couldn't be placed. Check your cart and try again."),
      );
      setPlacing(false);
      return;
    }
    const order = await res.json();
    await clear();
    router.push(`/orders/${order.id}`);
  }

  if (!cart && cartError) {
    return (
      <div className="empty">
        <h1>Your cart isn&apos;t available.</h1>
        <p>The cart service isn&apos;t responding. Check that cart-service is running, then refresh.</p>
      </div>
    );
  }
  if (!cart) return <div className="cart cart--skeleton" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="empty">
        <h1>Your cart is empty.</h1>
        <p>Add something from the range and it&apos;ll appear here.</p>
        <Link href="/" className="btn">
          Browse the range
        </Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <section className="cart__lines" aria-labelledby="cart-title">
        <h1 id="cart-title">Your cart</h1>
        <ul className="lines">
          {lines.map((l) => (
            <li key={l.product_id} className="line">
              <Link
                href={`/products/${l.product_id}`}
                className="line__art"
                data-category={l.product?.category}
                tabIndex={-1}
                aria-hidden="true"
              >
                {l.product && <ProductArt sku={l.product.sku} />}
              </Link>
              <div className="line__info">
                <Link href={`/products/${l.product_id}`} className="line__name">
                  {l.product?.name ?? `Product ${l.product_id}`}
                </Link>
                {l.product && <span className="muted">{money(l.product.price_cents)} each</span>}
              </div>
              {l.product && (
                <QuantityStepper
                  value={l.quantity}
                  min={1}
                  onChange={(q) => l.product && setQuantity(l.product, q)}
                  label={`Quantity of ${l.product.name}`}
                />
              )}
              <span className="line__total price">
                {l.product ? money(l.product.price_cents * l.quantity) : "—"}
              </span>
              <button
                className="link-button"
                onClick={() => l.product && setQuantity(l.product, 0)}
                aria-label={`Remove ${l.product?.name ?? "item"} from cart`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="summary" aria-labelledby="summary-title">
        <h2 id="summary-title">Order summary</h2>
        <dl>
          <div>
            <dt>Items</dt>
            <dd>{count}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>Free</dd>
          </div>
          <div className="summary__total">
            <dt>Total</dt>
            <dd className="price">{money(subtotal)}</dd>
          </div>
        </dl>
        <form onSubmit={placeOrder}>
          <label htmlFor="email">Email for your receipt</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn--block" disabled={placing}>
            {placing ? "Placing order…" : "Place order"}
          </button>
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
        </form>
        <p className="muted small">
          Payment is simulated. To see a declined payment, use an email address containing{" "}
          <code>+decline</code>.
        </p>
      </aside>
    </div>
  );
}
