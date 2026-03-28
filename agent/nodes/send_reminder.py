from ..state import SparkState


def send_reminder(state: SparkState) -> dict[str, dict[str, str]]:
    return {
        "result": {
            "status": "stubbed_for_phase_2",
            "type": "reminder",
            "title": state["parsed"]["title"],
        }
    }
