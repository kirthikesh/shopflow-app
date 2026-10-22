// Server-side only. The browser never talks to the backend services directly:
// it calls /api/* on this app, which forwards to the internal services.
// In Kubernetes this becomes the ingress / API gateway.

export const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL ?? "http://localhost:8001";
export const CART_SERVICE_URL = process.env.CART_SERVICE_URL ?? "http://localhost:8002";
export const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL ?? "http://localhost:8080";

export async function forward(url: string, init?: RequestInit): Promise<Response> {
  try {
    const upstream = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const body = upstream.status === 204 ? null : await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "service unavailable" }, { status: 503 });
  }
}
