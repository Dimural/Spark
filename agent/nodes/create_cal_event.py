from ..state import SparkState


def create_cal_event(state: SparkState) -> dict[str, dict[str, str]]:
    return {
        "result": {
            "status": "stubbed_for_phase_2",
            "type": "calendar_event",
            "title": state["parsed"]["title"],
        }
    }
