from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ..model import extract_json, get_llm
from ..prompts import PARSE_INPUT_PROMPT
from ..state import SparkState


def _resolve_today(timezone_name: str) -> str:
    try:
        return datetime.now(ZoneInfo(timezone_name)).date().isoformat()
    except ZoneInfoNotFoundError:
        return datetime.utcnow().date().isoformat()


def parse_input(state: SparkState, llm: Any | None = None) -> dict[str, Any]:
    model = llm or get_llm()
    today = _resolve_today(state.get("user_timezone", "UTC"))

    prompt = PARSE_INPUT_PROMPT.format(
        today=today,
        timezone=state.get("user_timezone", "UTC"),
        raw_text=state["raw_text"],
    )
    response = model.invoke(prompt)
    parsed = extract_json(response)

    return {"parsed": parsed}


def build_parse_input_node(llm: Any | None = None):
    def node(state: SparkState) -> dict[str, Any]:
        return parse_input(state, llm=llm)

    return node
