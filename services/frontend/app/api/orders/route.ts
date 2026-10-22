import { forward, ORDER_SERVICE_URL } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return forward(`${ORDER_SERVICE_URL}/orders`, { method: "POST", body: await req.text() });
}
