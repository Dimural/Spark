import { randomUUID } from "node:crypto";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const WINDOW_SECONDS = 24 * 60 * 60;
const MAX_REQUESTS = 10;

function getRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    throw new Error("Upstash Redis environment variables are missing.");
  }

  return {
    url: url.replace(/\/$/, ""),
    token,
  };
}

async function callRedis(command: string[]) {
  const { url, token } = getRedisEnv();
  const path = command.map((part) => encodeURIComponent(part)).join("/");
  const response = await fetch(`${url}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upstash request failed: ${text}`);
  }

  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `spark:rate-limit:${identifier}`;
  const windowStart = now - WINDOW_SECONDS * 1000;

  await callRedis(["zremrangebyscore", key, "0", String(windowStart)]);
  const count = Number((await callRedis(["zcard", key])) ?? 0);

  if (count >= MAX_REQUESTS) {
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      resetAt: now + WINDOW_SECONDS * 1000,
    };
  }

  await callRedis(["zadd", key, String(now), `${now}-${randomUUID()}`]);
  await callRedis(["expire", key, String(WINDOW_SECONDS)]);

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: Math.max(MAX_REQUESTS - count - 1, 0),
    resetAt: now + WINDOW_SECONDS * 1000,
  };
}
