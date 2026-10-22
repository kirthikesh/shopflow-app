import os

os.environ["DATABASE_URL"] = "sqlite:///./test-products.db"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import SEED_PRODUCTS  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:  # runs the lifespan, so seeding happens
        yield c
    Base.metadata.drop_all(engine)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_ready(client):
    assert client.get("/ready").status_code == 200


def test_seeded_products_are_listed(client):
    products = client.get("/products").json()
    assert len(products) == len(SEED_PRODUCTS)
    assert all(p["price_cents"] > 0 for p in products)


def test_filter_by_category(client):
    products = client.get("/products", params={"category": "audio"}).json()
    assert [p["sku"] for p in products] == ["SF-005"]


def test_get_missing_product_returns_404(client):
    assert client.get("/products/9999").status_code == 404


def test_create_product_and_reject_duplicate_sku(client):
    payload = {"sku": "SF-100", "name": "Cable", "category": "accessories", "price_cents": 999}
    created = client.post("/products", json=payload)
    assert created.status_code == 201
    assert client.get(f"/products/{created.json()['id']}").json()["name"] == "Cable"
    assert client.post("/products", json=payload).status_code == 409


def test_rejects_non_positive_price(client):
    payload = {"sku": "SF-101", "name": "Free", "category": "x", "price_cents": 0}
    assert client.post("/products", json=payload).status_code == 422


def test_metrics_endpoint(client):
    client.get("/products")
    assert "http_requests_total" in client.get("/metrics").text
