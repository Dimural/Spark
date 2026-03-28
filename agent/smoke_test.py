from dataclasses import dataclass

from langchain_core.messages import AIMessage

from agent.graph import build_graph


@dataclass
class FakeLLM:
    content: str

    def invoke(self, _: str) -> AIMessage:
        return AIMessage(content=self.content)


if __name__ == "__main__":
    parse_llm = FakeLLM(
        """
        {
          "date": "2026-03-28",
          "time": "15:00",
          "title": "Leetcode Session",
          "description": "Block Saturday afternoon for leetcode",
          "urgency": "normal",
          "people": [],
          "action_verb": "study"
        }
        """
    )
    classify_llm = FakeLLM('{ "intent": "calendar_event" }')
    graph = build_graph(parse_llm=parse_llm, classify_llm=classify_llm)

    result = graph.invoke(
        {
            "raw_text": "Saturday afternoon leetcode",
            "user_id": "demo-user",
            "user_timezone": "America/Toronto",
        }
    )

    print(result)
