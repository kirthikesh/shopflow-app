"use client";

import { useEffect, useState } from "react";

import { type Cart, money, type Product } from "@/lib/types";
import { getUserId } from "@/lib/user";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setProducts)
      .catch(() => setError("Couldn't load products. Is the product service running?"));
    fetch(`/api/cart/${getUserId()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCart)
      .catch(() => null);
  }, []);

  const quantityOf = (id: number) => cart?.items.find((i) => i.product_id === id)?.quantity ?? 0;

  async function add(product: Product) {
    const quantity = Math.min(quantityOf(product.id) + 1, 20);
    const res = await fetch(`/api/cart/${getUserId()}/items/${product.id}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) setCart(await res.json());
    else setError("Couldn't update the cart. Is the cart service running?");
  }

  return (
    <>
      <h1>Products</h1>
      {error && <p className="error">{error}</p>}
      {!products && !error && <p className="muted">Loading…</p>}
      <div className="grid">
        {products?.map((p) => (
          <div className="card" key={p.id}>
            <span className="tag">{p.category}</span>
            <strong>{p.name}</strong>
            <span className="muted">{p.description}</span>
            <span className="price">{money(p.price_cents)}</span>
            <button onClick={() => add(p)} disabled={p.stock === 0}>
              {quantityOf(p.id) ? `In cart (${quantityOf(p.id)}) · Add one` : "Add to cart"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
