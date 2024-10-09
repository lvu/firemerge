import csv
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

@dataclass
class Transaction:
    title: str
    timestamp: datetime
    src_account_id: int
    dst_account_id: int
    amount: Decimal
    comment: str


def read_csv(fname: str) -> list[Transaction]:
    """
    Read a CSV file in a specific format (Raiffesien online export).
    """
    with open(fname, "r") as f:
        reader = csv.DictReader(f)