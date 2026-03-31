import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardEventType = "calendar_event" | "reminder" | "note";

export type DashboardEvent = {
  id: string;
  type: DashboardEventType;
  title: string;
  description: string | null;
  event_date: string | null;
  created_at: string;
  raw_note: string | null;
  status: string | null;
};

export type DashboardSummary = {
  totalProcessed: number;
  shortcutRuns: number;
  processedThisWeek: number;
  byType: Record<DashboardEventType, number>;
  latestProcessedAt: string | null;
  latestShortcutRunAt: string | null;
  nextScheduledAt: string | null;
  pendingProcessing: boolean;
};

type ApiCallRow = {
  called_at: string | null;
};

const PROCESSING_WINDOW_MS = 10 * 60 * 1000;

function isValidDate(value: string | null) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function getProcessedThisWeek(events: DashboardEvent[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  return events.reduce((count, event) => {
    const createdAt = Date.parse(event.created_at);

    if (Number.isNaN(createdAt) || createdAt < weekAgo || createdAt > now) {
      return count;
    }

    return count + 1;
  }, 0);
}

function getNextScheduledAt(events: DashboardEvent[]) {
  const now = Date.now();

  const upcoming = events
    .map((event) => event.event_date)
    .filter(isValidDate)
    .map((value) => value as string)
    .filter((value) => Date.parse(value) >= now)
    .sort((left, right) => Date.parse(left) - Date.parse(right));

  return upcoming[0] ?? null;
}

export function buildDashboardSummary(
  events: DashboardEvent[],
  latestShortcutRunAt: string | null,
  shortcutRuns: number,
): DashboardSummary {
  const byType = events.reduce<Record<DashboardEventType, number>>(
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

  const latestProcessedAt = events[0]?.created_at ?? null;
  const latestShortcutMs = latestShortcutRunAt ? Date.parse(latestShortcutRunAt) : Number.NaN;
  const latestProcessedMs = latestProcessedAt ? Date.parse(latestProcessedAt) : Number.NaN;
  const pendingProcessing =
    !Number.isNaN(latestShortcutMs) &&
    Date.now() - latestShortcutMs <= PROCESSING_WINDOW_MS &&
    (Number.isNaN(latestProcessedMs) || latestShortcutMs > latestProcessedMs);

  return {
    totalProcessed: events.length,
    shortcutRuns,
    processedThisWeek: getProcessedThisWeek(events),
    byType,
    latestProcessedAt,
    latestShortcutRunAt,
    nextScheduledAt: getNextScheduledAt(events),
    pendingProcessing,
  };
}

export async function getDashboardSnapshot(
  supabase: SupabaseClient,
) {
  const [{ data: events, error: eventsError }, apiCallsResult] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase
      .from("api_calls")
      .select("called_at", { count: "exact" })
      .eq("endpoint", "/api/ingest-note")
      .order("called_at", { ascending: false })
      .limit(1),
  ]);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  if (apiCallsResult.error) {
    throw new Error(apiCallsResult.error.message);
  }

  const latestShortcutRunAt = (apiCallsResult.data as ApiCallRow[] | null)?.[0]?.called_at ?? null;
  const dashboardEvents = (events ?? []) as DashboardEvent[];

  return {
    events: dashboardEvents,
    summary: buildDashboardSummary(
      dashboardEvents,
      latestShortcutRunAt,
      apiCallsResult.count ?? 0,
    ),
  };
}
