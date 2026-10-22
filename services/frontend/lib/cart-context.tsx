"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { type Cart, MAX_QUANTITY, type Product } from "@/lib/types";
import { getUserId } from "@/lib/user";

type Toast = { id: number; message: string };

type CartState = {
  products: Product[] | null;
  productsError: boolean;
  cart: Cart | null;
  cartError: boolean;
  count: number;
  quantityOf: (productId: number) => number;
  setQuantity: (product: Product, quantity: number) => Promise<boolean>;
  add: (product: Product, quantity?: number) => Promise<boolean>;
  clear: () => Promise<void>;
  toast: Toast | null;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartError, setCartError] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setProducts)
      .catch(() => setProductsError(true));
    fetch(`/api/cart/${getUserId()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setCart)
      .catch(() => setCartError(true));
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const quantityOf = useCallback(
    (productId: number) => cart?.items.find((i) => i.product_id === productId)?.quantity ?? 0,
    [cart],
  );

  const setQuantity = useCallback(async (product: Product, quantity: number) => {
    const url = `/api/cart/${getUserId()}/items/${product.id}`;
    const res =
      quantity <= 0
        ? await fetch(url, { method: "DELETE" })
        : await fetch(url, {
            method: "PUT",
            body: JSON.stringify({ quantity: Math.min(quantity, MAX_QUANTITY) }),
          });
    if (!res.ok) {
      setCartError(true);
      return false;
    }
    setCartError(false);
    setCart(await res.json());
    return true;
  }, []);

  const add = useCallback(
    async (product: Product, quantity = 1) => {
      const ok = await setQuantity(product, quantityOf(product.id) + quantity);
      showToast(ok ? `Added ${product.name} to your cart` : "Couldn't update your cart. Try again in a moment.");
      return ok;
    },
    [quantityOf, setQuantity, showToast],
  );

  const clear = useCallback(async () => {
    await fetch(`/api/cart/${getUserId()}`, { method: "DELETE" });
    setCart((c) => (c ? { ...c, items: [], total_quantity: 0 } : c));
  }, []);

  const value = useMemo(
    () => ({
      products,
      productsError,
      cart,
      cartError,
      count: cart?.total_quantity ?? 0,
      quantityOf,
      setQuantity,
      add,
      clear,
      toast,
    }),
    [products, productsError, cart, cartError, quantityOf, setQuantity, add, clear, toast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
