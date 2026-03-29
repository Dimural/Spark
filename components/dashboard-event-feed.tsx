"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

type EventType = "all" | "calendar_event" | "reminder" | "note";

type DashboardEvent = {
  id: string;
  type: Exclude<EventType, "all">;
  title: string;
  description: string | null;
  event_date: string | null;
  created_at: string;
  raw_note: string | null;
  status: string | null;
};

type DashboardEventFeedProps = {
  initialEvents: DashboardEvent[];
};

const filters: Array<{ label: string; value: EventType }> = [
  { label: "All", value: "all" },
  { label: "Calendar", value: "calendar_event" },
  { label: "Reminders", value: "reminder" },
  { label: "Notes", value: "note" },
];

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No scheduled time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function typeLabel(type: DashboardEvent["type"]) {
  if (type === "calendar_event") {
    return "Calendar event";
  }

  if (type === "reminder") {
    return "Reminder";
  }

  return "Note";
}

export function DashboardEventFeed({ initialEvents }: DashboardEventFeedProps) {
  const [selectedFilter, setSelectedFilter] = useState<EventType>("all");
  const [events, setEvents] = useState(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setIsLoading(true);
      setError("");

      const query =
        selectedFilter === "all" ? "/api/events" : `/api/events?type=${selectedFilter}`;

      try {
        const response = await fetch(query, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          success: boolean;
          events?: DashboardEvent[];
          error?: string;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Unable to load events.");
        }

        if (!cancelled) {
          setEvents(payload.events ?? []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : "Unable to load events.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [selectedFilter]);

  const stats = useMemo(() => {
    return initialEvents.reduce(
      (accumulator, event) => {
        accumulator[event.type] += 1;
        return accumulator;
      },
      {
        calendar_event: 0,
        reminder: 0,
        note: 0,
      },
    );
  }, [initialEvents]);

  return (
    <section className="dashboard-data-shell">
      <div className="dashboard-overview">
        <article className="dashboard-overview__card">
          <span>Calendar events</span>
          <strong>{stats.calendar_event}</strong>
        </article>
        <article className="dashboard-overview__card">
          <span>Reminders</span>
          <strong>{stats.reminder}</strong>
        </article>
        <article className="dashboard-overview__card">
          <span>Saved notes</span>
          <strong>{stats.note}</strong>
        </article>
      </div>

      <div className="dashboard-feed">
        <div className="dashboard-feed__toolbar">
          <div>
            <p className="section-kicker">Processed items</p>
            <h2 className="dashboard-feed__title">Everything Spark routed for you</h2>
          </div>

          <div className="dashboard-filter-row" role="tablist" aria-label="Event type filters">
            {filters.map((filter) => (
              <button
                key={filter.value}
                className={
                  filter.value === selectedFilter
                    ? "dashboard-filter dashboard-filter--active"
                    : "dashboard-filter"
                }
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setSelectedFilter(filter.value);
                  });
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? <p className="dashboard-feed__status">Loading latest items...</p> : null}
        {error ? <p className="dashboard-feed__status dashboard-feed__status--error">{error}</p> : null}

        {!isLoading && !error && events.length === 0 ? (
          <div className="dashboard-empty-state">
            <h3>No items yet</h3>
            <p>
              Once you run the Shortcut, routed calendar events, reminders, and notes
              will appear here.
            </p>
          </div>
        ) : null}

        <div className="dashboard-event-list">
          {events.map((event) => (
            <article className="dashboard-event-card" key={event.id}>
              <div className="dashboard-event-card__meta">
                <span>{typeLabel(event.type)}</span>
                <span>{formatTimestamp(event.event_date ?? event.created_at)}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.description || event.raw_note || "No extra details saved."}</p>
              <div className="dashboard-event-card__footer">
                <span>Status: {event.status || "processed"}</span>
                {event.raw_note ? <span>Raw note stored</span> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
