from fastapi import APIRouter

from firemerge.api.deps import FireflyClientDep
from firemerge.model.common import Category, Currency

router = APIRouter()


@router.get("/categories")
async def get_categories(firefly_client: FireflyClientDep) -> list[Category]:
    return await firefly_client.get_categories()


@router.get("/currencies")
async def get_currencies(firefly_client: FireflyClientDep) -> list[Currency]:
    return await firefly_client.get_currencies()
