import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine, get_session
from app.models import Product
from app.schemas import ProductIn, ProductOut
from app.seed import seed_if_empty

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger("product-service")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Phase 1 creates tables on startup. Migrations (Alembic) come later.
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        added = seed_if_empty(session)
        if added:
            log.info("seeded %d products", added)
    yield


app = FastAPI(title="product-service", version="0.1.0", lifespan=lifespan)
Instrumentator(excluded_handlers=["/health", "/ready", "/metrics"]).instrument(app).expose(
    app, include_in_schema=False
)


@app.get("/health", include_in_schema=False)
def health():
    """Liveness: the process is up."""
    return {"status": "ok"}


@app.get("/ready", include_in_schema=False)
def ready(response: Response, session: Session = Depends(get_session)):
    """Readiness: the database is reachable."""
    try:
        session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:  # noqa: BLE001
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "database unavailable"}


@app.get("/products", response_model=list[ProductOut])
def list_products(category: str | None = None, session: Session = Depends(get_session)):
    query = select(Product).order_by(Product.id)
    if category:
        query = query.where(Product.category == category)
    return session.scalars(query).all()


@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="product not found")
    return product


@app.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductIn, session: Session = Depends(get_session)):
    product = Product(**payload.model_dump())
    session.add(product)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="sku already exists") from None
    session.refresh(product)
    return product
