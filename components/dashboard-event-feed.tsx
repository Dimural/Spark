"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import type { DashboardEvent, DashboardEventType, DashboardSummary } from "@/lib/dashboard";

type EventType = "all" | DashboardEventType;

type DashboardEventFeedProps = {
  initialEvents: DashboardEvent[];
  initialSummary: DashboardSummary | null;
};

type EventsResponse = {
  success: boolean;
  events?: DashboardEvent[];
  error?: string;
};

type SummaryResponse = {
  success: boolean;
  summary?: DashboardSummary;
  error?: string;
};

const filters: Array<{ label: string; value: EventType }> = [
  { label: "All", value: "all" },
  { label: "Calendar", value: "calendar_event" },
  { label: "Reminders", value: "reminder" },
  { label: "Notes", value: "note" },
];

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No recent activity";
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

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  const stamp = Date.parse(value);

  if (Number.isNaN(stamp)) {
    return value;
  }

  const deltaMs = stamp - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];

  for (const [unit, unitMs] of ranges) {
    if (Math.abs(deltaMs) >= unitMs || unit === "minute") {
      return formatter.format(Math.round(deltaMs / unitMs), unit);
    }
  }

  return "Just now";
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

async function getEvents(filter: EventType) {
  const query = filter === "all" ? "/api/events" : `/api/events?type=${filter}`;
  const response = await fetch(query, {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as EventsResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Unable to load events.");
  }

  return payload.events ?? [];
}

async function getSummary() {
  const response = await fetch("/api/events/summary", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as SummaryResponse;

  if (!response.ok || !payload.success || !payload.summary) {
    throw new Error(payload.error || "Unable to load dashboard summary.");
  }

  return payload.summary;
}

function summaryChanged(previous: DashboardSummary | null, next: DashboardSummary) {
  if (!previous) {
    return true;
  }

  return JSON.stringify(previous) !== JSON.stringify(next);
}

export function DashboardEventFeed({
  initialEvents,
  initialSummary,
}: DashboardEventFeedProps) {
  const [selectedFilter, setSelectedFilter] = useState<EventType>("all");
  const [events, setEvents] = useState(initialEvents);
  const [summary, setSummary] = useState<DashboardSummary | null>(initialSummary);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEventsForFilter() {
      setIsLoading(true);
      setError("");

      try {
        const nextEvents = await getEvents(selectedFilter);

        if (!cancelled) {
          setEvents(nextEvents);
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

    void loadEventsForFilter();

    return () => {
      cancelled = true;
    };
  }, [selectedFilter]);

  useEffect(() => {
    let cancelled = false;

    async function refreshDashboard(quiet: boolean) {
      if (!quiet) {
        setIsRefreshing(true);
      }

      try {
        const nextSummary = await getSummary();

        if (cancelled) {
          return;
        }

        const hasSummaryChanged = summaryChanged(summary, nextSummary);
        const shouldRefreshEvents =
          hasSummaryChanged ||
          (selectedFilter === "all" && nextSummary.totalProcessed !== events.length);

        if (hasSummaryChanged) {
          setSummary(nextSummary);
        }

        if (shouldRefreshEvents) {
          const nextEvents = await getEvents(selectedFilter);

          if (!cancelled) {
            setEvents(nextEvents);
            setError("");
          }
        }
      } catch (requestError) {
        if (!quiet && !cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to refresh dashboard activity.",
          );
        }
      } finally {
        if (!quiet && !cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    const interval = window.setInterval(() => {
      void refreshDashboard(true);
    }, summary?.pendingProcessing ? 3000 : 10000);

    void refreshDashboard(true);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [events.length, selectedFilter, summary]);

  return (
    <section className="dashboard-data-shell">
      <div className="dashboard-analytics-grid">
        <article className="dashboard-overview__card dashboard-overview__card--spotlight">
          <span>Total notes processed</span>
          <strong>{summary?.totalProcessed ?? initialEvents.length}</strong>
          <p>
            {summary?.processedThisWeek ?? 0} routed in the last 7 days across notes,
            reminders, and calendar actions.
          </p>
        </article>

        <article className="dashboard-overview__card">
          <span>Shortcut runs</span>
          <strong>{summary?.shortcutRuns ?? 0}</strong>
          <p>Every authenticated `/api/ingest-note` call is counted here for quick activity tracking.</p>
        </article>

        <article className="dashboard-overview__card">
          <span>Next scheduled item</span>
          <strong>{formatRelativeTime(summary?.nextScheduledAt ?? null)}</strong>
          <p>{formatTimestamp(summary?.nextScheduledAt ?? null)}</p>
        </article>

        <article className="dashboard-overview__card">
          <span>Last processed</span>
          <strong>{formatRelativeTime(summary?.latestProcessedAt ?? null)}</strong>
          <p>{formatTimestamp(summary?.latestProcessedAt ?? null)}</p>
        </article>
      </div>

      <div className="dashboard-breakdown">
        <article className="dashboard-breakdown__card">
          <span>Calendar events</span>
          <strong>{summary?.byType.calendar_event ?? 0}</strong>
        </article>
        <article className="dashboard-breakdown__card">
          <span>Reminders</span>
          <strong>{summary?.byType.reminder ?? 0}</strong>
        </article>
        <article className="dashboard-breakdown__card">
          <span>Notes</span>
          <strong>{summary?.byType.note ?? 0}</strong>
        </article>
      </div>

      {summary?.pendingProcessing ? (
        <div className="dashboard-processing-indicator" role="status" aria-live="polite">
          <div>
            <p className="section-kicker">Processing</p>
            <h3>Spark is handling your latest Shortcut run.</h3>
            <p>
              The dashboard is polling for the next routed item and will refresh
              automatically when it lands.
            </p>
          </div>
          <div className="dashboard-processing-indicator__meta">
            <span>Last Shortcut activity</span>
            <strong>{formatTimestamp(summary.latestShortcutRunAt)}</strong>
          </div>
        </div>
      ) : null}

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
        {!isLoading && isRefreshing ? (
          <p className="dashboard-feed__status">Refreshing activity…</p>
        ) : null}
        {error ? (
          <p className="dashboard-feed__status dashboard-feed__status--error">{error}</p>
        ) : null}

        {!isLoading && !error && events.length === 0 ? (
          <div className="dashboard-empty-state">
            <p className="dashboard-empty-state__eyebrow">No processed items yet</p>
            <h3>Your dashboard fills itself after the first Shortcut run.</h3>
            <p>
              Install the Shortcut, send one messy note from `Spark Inbox`, and Spark
              will route it into a calendar event, reminder, or saved note here.
            </p>
            <div className="dashboard-empty-state__actions">
              <Link className="primary-button" href="/onboarding/shortcut">
                Install Shortcut
              </Link>
              <Link className="secondary-button" href="/onboarding">
                Review setup
              </Link>
            </div>
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
