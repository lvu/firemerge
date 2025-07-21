from aiocache import BaseCache

from firemerge.model import StatementTransaction


class Session:
    def __init__(self, cache: BaseCache, session_id: str):
        self.session_id = session_id
        self.cache = cache

    async def get_statement(self) -> list[StatementTransaction] | None:
        return await self.cache.get(f"statement:{self.session_id}")

    async def set_statement(self, statement: list[StatementTransaction]) -> None:
        await self.cache.set(f"statement:{self.session_id}", statement)
