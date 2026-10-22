import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.main import CART_TTL_SECONDS, app, get_redis


@pytest.fixture()
def r():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture()
def client(r):
    app.dependency_overrides[get_redis] = lambda: r
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_empty_cart(client):
    body = client.get("/carts/user-1").json()
    assert body == {"user_id": "user-1", "items": [], "total_quantity": 0}


def test_add_update_and_remove_items(client):
    client.put("/carts/user-1/items/3", json={"quantity": 2})
    body = client.put("/carts/user-1/items/1", json={"quantity": 1}).json()
    assert [i["product_id"] for i in body["items"]] == [1, 3]
    assert body["total_quantity"] == 3

    body = client.put("/carts/user-1/items/3", json={"quantity": 5}).json()
    assert body["total_quantity"] == 6

    body = client.delete("/carts/user-1/items/1").json()
    assert body["items"] == [{"product_id": 3, "quantity": 5}]


def test_removing_missing_item_returns_404(client):
    assert client.delete("/carts/user-1/items/42").status_code == 404


def test_clear_cart(client):
    client.put("/carts/user-1/items/1", json={"quantity": 1})
    assert client.delete("/carts/user-1").status_code == 204
    assert client.get("/carts/user-1").json()["items"] == []


def test_carts_are_isolated_per_user(client):
    client.put("/carts/alice/items/1", json={"quantity": 1})
    assert client.get("/carts/bob").json()["items"] == []


def test_cart_expires(client, r):
    client.put("/carts/user-1/items/1", json={"quantity": 1})
    assert 0 < r.ttl("cart:user-1") <= CART_TTL_SECONDS


@pytest.mark.parametrize("qty", [0, -1, 21])
def test_rejects_bad_quantity(client, qty):
    assert client.put("/carts/user-1/items/1", json={"quantity": qty}).status_code == 422


def test_rejects_bad_user_id(client):
    assert client.get("/carts/bad$id").status_code == 422


def test_ready(client):
    assert client.get("/ready").status_code == 200
