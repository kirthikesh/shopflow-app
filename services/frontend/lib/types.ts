export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
};

export type Cart = {
  user_id: string;
  items: { product_id: number; quantity: number }[];
  total_quantity: number;
};

export type Order = {
  id: string;
  customerEmail: string;
  status: "PENDING_PAYMENT" | "PAID" | "PAYMENT_FAILED";
  statusReason: string | null;
  totalCents: number;
  currency: string;
  items: { productId: number; productName: string; quantity: number; unitPriceCents: number }[];
  createdAt: string;
};

export const money = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
