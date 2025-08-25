from importlib import resources
from importlib.resources.abc import Traversable
from pathlib import Path

import yaml

from firemerge.model.account_settings import RepoStatementParserSettings


def load_config(name: str) -> RepoStatementParserSettings:
    return _load_config(resources.files("firemerge.statement.configs") / name)


def load_configs() -> list[RepoStatementParserSettings]:
    result = []
    for config in resources.files("firemerge.statement.configs").iterdir():
        result.append(_load_config(config))
    return result


def _load_config(path: Path | Traversable) -> RepoStatementParserSettings:
    with path.open("r") as f:
        return RepoStatementParserSettings.model_validate(yaml.safe_load(f))
