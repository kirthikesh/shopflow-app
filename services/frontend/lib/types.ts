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

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PAYMENT_FAILED";

export type Order = {
  id: string;
  customerEmail: string;
  status: OrderStatus;
  statusReason: string | null;
  totalCents: number;
  currency: string;
  items: { productId: number; productName: string; quantity: number; unitPriceCents: number }[];
  createdAt: string;
  updatedAt: string;
};

export const MAX_QUANTITY = 20;

export const money = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

const CATEGORY_NAMES: Record<string, string> = {
  peripherals: "Peripherals",
  displays: "Displays",
  audio: "Audio",
  accessories: "Accessories",
};

export const categoryName = (slug: string) =>
  CATEGORY_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
