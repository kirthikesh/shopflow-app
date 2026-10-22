"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductArt } from "@/components/ProductArt";
import { ProductTile } from "@/components/ProductTile";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/lib/cart-context";
import { categoryName, MAX_QUANTITY, money, type Product } from "@/lib/types";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, add, quantityOf } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [missing, setMissing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setProduct)
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <div className="empty">
        <h1>We couldn&apos;t find that product.</h1>
        <p>It may have been removed from the range.</p>
        <Link href="/" className="btn">
          Back to the shop
        </Link>
      </div>
    );
  }
  if (!product) return <div className="detail detail--skeleton" aria-busy="true" />;

  const inCart = quantityOf(product.id);
  const room = MAX_QUANTITY - inCart;
  const related = (products ?? []).filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  async function onAdd() {
    if (!product) return;
    setBusy(true);
    if (await add(product, Math.min(quantity, room))) setQuantity(1);
    setBusy(false);
  }

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Shop</Link>
        <span aria-hidden="true">/</span>
        <span>{categoryName(product.category)}</span>
      </nav>

      <section className="detail">
        <div className="detail__art" data-category={product.category}>
          <ProductArt sku={product.sku} title={product.name} />
        </div>
        <div className="detail__info">
          <h1>{product.name}</h1>
          <p className="detail__price price">{money(product.price_cents)}</p>
          <p className="detail__desc">{product.description}</p>
          <p className={`stock ${product.stock < 20 ? "stock--low" : ""}`}>
            {product.stock === 0
              ? "Out of stock"
              : product.stock < 20
                ? `Only ${product.stock} left`
                : "In stock, ready to ship"}
          </p>
          <div className="detail__buy">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              label="Quantity"
              disabled={product.stock === 0 || room <= 0}
            />
            <button className="btn" onClick={onAdd} disabled={busy || product.stock === 0 || room <= 0}>
              {busy ? "Adding…" : "Add to cart"}
            </button>
          </div>
          {inCart > 0 && (
            <p className="muted">
              {inCart} already in your cart. <Link href="/cart">Go to cart</Link>
            </p>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <h2 id="related-title">More {categoryName(product.category).toLowerCase()}</h2>
          <div className="grid">
            {related.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
