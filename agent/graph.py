from langgraph.graph import END, StateGraph

from .nodes.classify_intent import build_classify_intent_node
from .nodes.create_cal_event import create_cal_event
from .nodes.parse_input import build_parse_input_node
from .nodes.save_note import save_note
from .nodes.send_reminder import send_reminder
from .state import SparkState


def route_intent(state: SparkState) -> str:
    return state["intent"]


def build_graph(parse_llm=None, classify_llm=None):
    graph = StateGraph(SparkState)

    graph.add_node("parse_input", build_parse_input_node(parse_llm))
    graph.add_node("classify_intent", build_classify_intent_node(classify_llm))
    graph.add_node("create_cal_event", create_cal_event)
    graph.add_node("send_reminder", send_reminder)
    graph.add_node("save_note", save_note)

    graph.set_entry_point("parse_input")
    graph.add_edge("parse_input", "classify_intent")
    graph.add_conditional_edges(
        "classify_intent",
        route_intent,
        {
            "calendar_event": "create_cal_event",
            "reminder": "send_reminder",
            "note": "save_note",
        },
    )
    graph.add_edge("create_cal_event", END)
    graph.add_edge("send_reminder", END)
    graph.add_edge("save_note", END)

    return graph.compile()


spark_agent = build_graph()
