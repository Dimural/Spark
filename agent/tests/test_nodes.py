from dataclasses import dataclass

from langchain_core.messages import AIMessage

from agent.nodes.classify_intent import classify_intent
from agent.nodes.parse_input import parse_input


@dataclass
class FakeLLM:
    content: str

    def invoke(self, _: str) -> AIMessage:
        return AIMessage(content=self.content)


def test_parse_input_returns_structured_json():
    llm = FakeLLM(
        """
        {
          "date": "2026-03-29",
          "time": "09:00",
          "title": "Send deck",
          "description": "Send the investor deck tomorrow morning",
          "urgency": "high",
          "people": ["Alex"],
          "action_verb": "send"
        }
        """
    )

    result = parse_input(
        {
            "raw_text": "tomorrow morning send the investor deck to Alex",
            "user_timezone": "America/Toronto",
        },
        llm=llm,
    )

    assert result["parsed"]["title"] == "Send deck"
    assert result["parsed"]["urgency"] == "high"
    assert result["parsed"]["people"] == ["Alex"]


def test_classify_intent_returns_supported_intent():
    llm = FakeLLM('{ "intent": "reminder" }')

    result = classify_intent(
        {
            "parsed": {
                "title": "Buy groceries",
                "description": "Pick up groceries after work",
                "date": None,
                "time": None,
            }
        },
        llm=llm,
    )

    assert result == {"intent": "reminder"}
