"use client";

import { useMemo, useState } from "react";

import { DeskScene } from "@/components/ProductArt";
import { ProductTile } from "@/components/ProductTile";
import { useCart } from "@/lib/cart-context";
import { categoryName } from "@/lib/types";

export default function ShopPage() {
  const { products, productsError } = useCart();
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => Array.from(new Set((products ?? []).map((p) => p.category))).sort(),
    [products],
  );
  const shown = (products ?? []).filter((p) => category === "all" || p.category === category);

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <h1>Everything your desk is missing.</h1>
          <p>
            Keyboards that feel right, a sharper screen, and the small things that keep cables off the floor.
            Ordered today, confirmed in seconds.
          </p>
          <a href="#range" className="btn">
            Shop the range
          </a>
        </div>
        <div className="hero__art">
          <DeskScene />
        </div>
      </section>

      <section id="range" className="range" aria-labelledby="range-title">
        <div className="range__head">
          <h2 id="range-title">The range</h2>
          {categories.length > 0 && (
            <div className="filters" role="group" aria-label="Filter by category">
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c === "all" ? "Everything" : categoryName(c)}
                </button>
              ))}
            </div>
          )}
        </div>

        {productsError && (
          <p className="notice notice--error">
            The product catalogue isn&apos;t responding. Check that product-service is running, then refresh.
          </p>
        )}
        {!products && !productsError && (
          <div className="grid" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="tile tile--skeleton" />
            ))}
          </div>
        )}
        {products && (
          <div className="grid">
            {shown.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
