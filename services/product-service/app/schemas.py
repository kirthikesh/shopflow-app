from pydantic import BaseModel, ConfigDict, Field


class ProductIn(BaseModel):
    sku: str = Field(min_length=3, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    category: str = Field(min_length=1, max_length=40)
    price_cents: int = Field(gt=0)
    stock: int = Field(ge=0, default=0)


class ProductOut(ProductIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
