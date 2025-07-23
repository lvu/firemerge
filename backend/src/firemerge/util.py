from typing import AsyncIterable, Callable, Coroutine, TypeVar, ParamSpec, Any

T = TypeVar("T")
P = ParamSpec("P")


def async_collect(
    f: Callable[P, AsyncIterable[T]],
) -> Callable[P, Coroutine[list[T], Any, Any]]:
    """
    Decorator to collect the results of an async iterable into a list.
    """

    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> list[T]:
        return [x async for x in f(*args, **kwargs)]

    return wrapper
