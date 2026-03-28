from typing import Any, TypedDict


class SparkState(TypedDict, total=False):
    raw_text: str
    parsed: dict[str, Any]
    intent: str
    user_id: str
    user_timezone: str
    result: dict[str, Any]
