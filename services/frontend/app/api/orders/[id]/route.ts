import { forward, ORDER_SERVICE_URL } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forward(`${ORDER_SERVICE_URL}/orders/${encodeURIComponent(id)}`);
}
