import { CART_SERVICE_URL, forward } from "@/lib/backend";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string; productId: string }> };

const itemUrl = (userId: string, productId: string) =>
  `${CART_SERVICE_URL}/carts/${encodeURIComponent(userId)}/items/${encodeURIComponent(productId)}`;

export async function PUT(req: Request, { params }: Ctx) {
  const { userId, productId } = await params;
  return forward(itemUrl(userId, productId), { method: "PUT", body: await req.text() });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { userId, productId } = await params;
  return forward(itemUrl(userId, productId), { method: "DELETE" });
}
