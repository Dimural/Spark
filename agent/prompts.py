PARSE_INPUT_PROMPT = """
You are extracting structured data from a messy personal note.
Today's date is {today}. The user's timezone is {timezone}.

Extract the following fields as JSON:
- date: resolved ISO date string if present, null if not
- time: resolved time string if present, null if not
- title: short title for this item (max 8 words)
- description: full description of the item
- urgency: "high" | "normal" | "low"
- people: list of people mentioned, empty list if none
- action_verb: the main action if present (e.g. "call", "submit", "study")

Raw note:
{raw_text}

Return ONLY valid JSON. No explanation. No markdown.
""".strip()


CLASSIFY_INTENT_PROMPT = """
You are classifying a personal note item into exactly one category.

Categories:
- calendar_event: has a date or time reference AND an activity to do at that time
- reminder: an actionable to-do without a specific time, or a follow-up task
- note: general information, reference material, no action required

Examples:
- "Saturday: leetcode" → calendar_event
- "call mom" → reminder
- "JWT tokens expire after 1 hour" → note
- "dentist appointment next Tuesday 3pm" → calendar_event
- "buy groceries" → reminder
- "interesting article about RAG" → note

Parsed item:
{parsed}

Return ONLY valid JSON: {{ "intent": "calendar_event" | "reminder" | "note" }}
No explanation. No markdown.
""".strip()
