"use client";

import Link from "next/link";
import { useState } from "react";

import { ProductArt } from "@/components/ProductArt";
import { useCart } from "@/lib/cart-context";
import { money, type Product } from "@/lib/types";

export function ProductTile({ product }: { product: Product }) {
  const { add, quantityOf } = useCart();
  const [busy, setBusy] = useState(false);
  const inCart = quantityOf(product.id);
  const soldOut = product.stock === 0;

  async function onAdd() {
    setBusy(true);
    await add(product);
    setBusy(false);
  }

  return (
    <article className="tile">
      <Link href={`/products/${product.id}`} className="tile__art" data-category={product.category}>
        <ProductArt sku={product.sku} />
        <span className="sr-only">{product.name}</span>
      </Link>
      <div className="tile__body">
        <h3 className="tile__name">
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <p className="tile__desc">{product.description}</p>
        <div className="tile__foot">
          <span className="price">{money(product.price_cents)}</span>
          <button className="btn btn--small" onClick={onAdd} disabled={busy || soldOut}>
            {soldOut ? "Sold out" : busy ? "Adding…" : inCart ? `Add another (${inCart})` : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
