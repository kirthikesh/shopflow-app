"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/lib/cart-context";

export function Header() {
  const { count } = useCart();
  const path = usePathname();

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link href="/" className="logo" aria-label="ShopFlow home">
          <svg viewBox="0 0 28 28" aria-hidden="true">
            <rect x="2" y="6" width="24" height="16" rx="4" fill="var(--ink)" />
            <rect x="6" y="10" width="5" height="4" rx="1" fill="var(--paper)" />
            <rect x="12" y="10" width="5" height="4" rx="1" fill="var(--paper)" />
            <rect x="18" y="10" width="4" height="4" rx="1" fill="var(--accent)" />
            <rect x="8" y="16" width="12" height="3" rx="1" fill="var(--paper)" />
          </svg>
          ShopFlow
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            Shop
          </Link>
          <Link href="/cart" className="cart-link" aria-current={path === "/cart" ? "page" : undefined}>
            Cart
            <span className="cart-count" aria-label={`${count} items`}>
              {count}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Toast() {
  const { toast } = useCart();
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.message}</span>
          <Link href="/cart">View cart</Link>
        </div>
      )}
    </div>
  );
}
