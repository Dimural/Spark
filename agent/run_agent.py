from __future__ import annotations

import json
import sys

from agent.graph import spark_agent


def main() -> int:
    payload = json.load(sys.stdin)
    result = spark_agent.invoke(payload)
    json.dump(result, sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
