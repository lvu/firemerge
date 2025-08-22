"""Account settings model."""

from collections import Counter
from enum import Enum
from typing import Annotated, Any, Literal, Self

from pydantic import BaseModel, Field, model_validator


class StatementFormat(str, Enum):
    CSV = "csv"
    XLSX = "xlsx"
    PDF = "pdf"


class StatementFormatSettingsCSV(BaseModel):
    format: Literal[StatementFormat.CSV] = StatementFormat.CSV
    separator: str
    encoding: str


class StatementFormatSettingsXLSX(BaseModel):
    format: Literal[StatementFormat.XLSX] = StatementFormat.XLSX


class StatementFormatSettingsPDF(BaseModel):
    format: Literal[StatementFormat.PDF] = StatementFormat.PDF


StatementFormatSettings = Annotated[
    StatementFormatSettingsCSV
    | StatementFormatSettingsXLSX
    | StatementFormatSettingsPDF,
    Field(discriminator="format"),
]


class ColumnRole(Enum):
    DATE = "date"
    NAME = "name"
    IBAN = "iban"
    CURRENCY_CODE = "currency_code"
    AMOUNT = "amount"
    AMOUNT_DEBIT = "amount_debit"
    AMOUNT_CREDIT = "amount_credit"
    FOREIGN_CURRENCY_CODE = "foreign_currency_code"
    FOREIGN_AMOUNT = "foreign_amount"
    DOC_NUMBER = "doc_number"


class ColumnInfo(BaseModel):
    name: str  # How the column is named in the statement header.
    notes_label: str | None = None  # Label of the column in the notes field.
    role: ColumnRole | None = None
    index: int


class StatementParserSettings(BaseModel):
    columns: list[ColumnInfo]
    format: StatementFormatSettings
    date_format: str = "%Y-%m-%d %H:%M:%S"
    decimal_separator: str | None = (
        None  # Only for non-standard decimal separators (i.e, not ".").
    )

    @model_validator(mode="before")
    @classmethod
    def assign_indices(cls, data: dict[str, Any]) -> dict[str, Any]:
        return {
            **data,
            "columns": [
                {
                    **column,
                    "index": index,
                }
                for index, column in enumerate(data["columns"])
            ],
        }

    @model_validator(mode="after")
    def validate_columns(self) -> Self:
        role_counts = Counter(
            column.role for column in self.columns if column.role is not None
        )
        non_unique_roles = [role for role, count in role_counts.items() if count > 1]
        if non_unique_roles:
            raise ValueError(f"Columns must have unique roles: {non_unique_roles}")
        if role_counts[ColumnRole.AMOUNT] and (
            role_counts[ColumnRole.AMOUNT_DEBIT]
            or role_counts[ColumnRole.AMOUNT_CREDIT]
        ):
            raise ValueError("Amount and amount debit/credit cannot be used together")
        if (
            role_counts[ColumnRole.FOREIGN_CURRENCY_CODE]
            != role_counts[ColumnRole.FOREIGN_AMOUNT]
        ):
            raise ValueError(
                "Foreign currency code and foreign amount must be used together"
            )
        if (
            role_counts[ColumnRole.AMOUNT_CREDIT]
            != role_counts[ColumnRole.AMOUNT_DEBIT]
        ):
            raise ValueError("Amount credit and amount debit must be used together")
        if role_counts[ColumnRole.DOC_NUMBER] and not role_counts[ColumnRole.IBAN]:
            raise ValueError("Doc number must be used together with IBAN")
        if not role_counts[ColumnRole.DATE]:
            raise ValueError("Date column is required")
        if (
            not role_counts[ColumnRole.AMOUNT]
            and not role_counts[ColumnRole.AMOUNT_DEBIT]
            and not role_counts[ColumnRole.AMOUNT_CREDIT]
        ):
            raise ValueError("Amount column is required")
        if not role_counts[ColumnRole.NAME]:
            raise ValueError("Name column is required")
        return self


class AccountSettings(BaseModel):
    blacklist: list[str] = []
    parser_settings: StatementParserSettings | None = None


class AccountSettingsConfig(AccountSettings):
    label: str
