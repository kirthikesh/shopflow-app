import { CART_SERVICE_URL, forward } from "@/lib/backend";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await params;
  return forward(`${CART_SERVICE_URL}/carts/${encodeURIComponent(userId)}`);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { userId } = await params;
  return forward(`${CART_SERVICE_URL}/carts/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
