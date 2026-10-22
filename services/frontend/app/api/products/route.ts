import { forward, PRODUCT_SERVICE_URL } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  return forward(`${PRODUCT_SERVICE_URL}/products`);
}
