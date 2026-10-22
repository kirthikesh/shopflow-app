import logging
import os

import redis
from fastapi import Depends, FastAPI, HTTPException, Path, Response, status
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CART_TTL_SECONDS = int(os.getenv("CART_TTL_SECONDS", str(7 * 24 * 3600)))
MAX_QUANTITY = 20

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    return _client


app = FastAPI(title="cart-service", version="0.1.0")
Instrumentator(excluded_handlers=["/health", "/ready", "/metrics"]).instrument(app).expose(
    app, include_in_schema=False
)

USER_ID = Path(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")


class CartItem(BaseModel):
    product_id: int
    quantity: int


class Cart(BaseModel):
    user_id: str
    items: list[CartItem]
    total_quantity: int


class QuantityIn(BaseModel):
    quantity: int = Field(ge=1, le=MAX_QUANTITY)


def _key(user_id: str) -> str:
    return f"cart:{user_id}"


def _read_cart(r: redis.Redis, user_id: str) -> Cart:
    raw = r.hgetall(_key(user_id))
    items = sorted(
        (CartItem(product_id=int(pid), quantity=int(qty)) for pid, qty in raw.items()),
        key=lambda i: i.product_id,
    )
    return Cart(user_id=user_id, items=items, total_quantity=sum(i.quantity for i in items))


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.get("/ready", include_in_schema=False)
def ready(response: Response, r: redis.Redis = Depends(get_redis)):
    try:
        r.ping()
        return {"status": "ready"}
    except redis.RedisError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "redis unavailable"}


@app.get("/carts/{user_id}", response_model=Cart)
def get_cart(user_id: str = USER_ID, r: redis.Redis = Depends(get_redis)):
    return _read_cart(r, user_id)


@app.put("/carts/{user_id}/items/{product_id}", response_model=Cart)
def set_item(
    payload: QuantityIn,
    product_id: int,
    user_id: str = USER_ID,
    r: redis.Redis = Depends(get_redis),
):
    """Set the quantity of one product. Prices are never stored here:
    the order service re-prices everything from the product service."""
    key = _key(user_id)
    pipe = r.pipeline()
    pipe.hset(key, str(product_id), payload.quantity)
    pipe.expire(key, CART_TTL_SECONDS)
    pipe.execute()
    return _read_cart(r, user_id)


@app.delete("/carts/{user_id}/items/{product_id}", response_model=Cart)
def remove_item(product_id: int, user_id: str = USER_ID, r: redis.Redis = Depends(get_redis)):
    if not r.hdel(_key(user_id), str(product_id)):
        raise HTTPException(status_code=404, detail="item not in cart")
    return _read_cart(r, user_id)


@app.delete("/carts/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(user_id: str = USER_ID, r: redis.Redis = Depends(get_redis)):
    r.delete(_key(user_id))

