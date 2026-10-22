from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Product

SEED_PRODUCTS = [
    ("SF-001", "Mechanical Keyboard", "Hot-swappable, 75% layout.", "peripherals", 8999, 40),
    ("SF-002", "Wireless Mouse", "Ergonomic, 70 hours battery.", "peripherals", 3499, 120),
    ("SF-003", "27\" 4K Monitor", "IPS panel, USB-C 65W.", "displays", 32900, 15),
    ("SF-004", "USB-C Dock", "Dual display, 100W passthrough.", "accessories", 12900, 30),
    ("SF-005", "Noise-Cancelling Headphones", "Over-ear, 30 hours battery.", "audio", 24900, 25),
    ("SF-006", "Laptop Stand", "Aluminium, adjustable height.", "accessories", 4500, 60),
    ("SF-007", "1080p Webcam", "Auto-focus, dual microphones.", "peripherals", 6999, 45),
    ("SF-008", "Desk Mat", "Stitched edges, 90 x 40 cm.", "accessories", 1999, 200),
]


def seed_if_empty(session: Session) -> int:
    count = session.scalar(select(func.count()).select_from(Product))
    if count:
        return 0
    for sku, name, description, category, price_cents, stock in SEED_PRODUCTS:
        session.add(
            Product(
                sku=sku,
                name=name,
                description=description,
                category=category,
                price_cents=price_cents,
                stock=stock,
            )
        )
    session.commit()
    return len(SEED_PRODUCTS)
