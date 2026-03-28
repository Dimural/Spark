import json
from typing import Any

from ..model import extract_json, get_llm
from ..prompts import CLASSIFY_INTENT_PROMPT
from ..state import SparkState


def classify_intent(state: SparkState, llm: Any | None = None) -> dict[str, str]:
    model = llm or get_llm()
    prompt = CLASSIFY_INTENT_PROMPT.format(
        parsed=json.dumps(state["parsed"], ensure_ascii=True),
    )
    response = model.invoke(prompt)
    parsed = extract_json(response)
    intent = parsed["intent"]

    if intent not in {"calendar_event", "reminder", "note"}:
        raise ValueError(f"Unsupported intent returned by model: {intent}")

    return {"intent": intent}


def build_classify_intent_node(llm: Any | None = None):
    def node(state: SparkState) -> dict[str, str]:
        return classify_intent(state, llm=llm)

    return node
