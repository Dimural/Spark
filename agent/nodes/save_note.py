from ..state import SparkState


def save_note(state: SparkState) -> dict[str, dict[str, str]]:
    return {
        "result": {
            "status": "stubbed_for_phase_2",
            "type": "note",
            "title": state["parsed"]["title"],
        }
    }
