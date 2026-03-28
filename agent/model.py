import json
import os
from typing import Any

from langchain_core.messages import BaseMessage
from langchain_groq import ChatGroq


def get_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is required to run the Spark agent.")

    return ChatGroq(
        api_key=api_key,
        model="llama3-8b-8192",
        temperature=0,
    )


def extract_json(content: Any) -> dict[str, Any]:
    if isinstance(content, BaseMessage):
        raw = content.content
    else:
        raw = content

    if isinstance(raw, list):
        raw = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in raw
        )

    text = str(raw).strip()

    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(line for line in lines if not line.startswith("```")).strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end < start:
        raise ValueError(f"Model did not return JSON: {text}")

    return json.loads(text[start : end + 1])
