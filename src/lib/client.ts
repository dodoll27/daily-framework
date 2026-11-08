"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { useEffect, useState } from "react";
import type { Block, Day, DayTemplate, Session, Slot, StreakStats, Task, WeekStats } from "./types";
import { addDays, dayStartIso } from "./time";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, method = "GET", data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data !== undefined ? { "content-type": "application/json" } : undefined,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!res.ok) throw new ApiError(res.status, json.error ?? res.statusText);
  return json as T;
}

const fetcher = <T,>(url: string) => api<T>(url);

export const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Revalidate everything under /api after a mutation. */
export function refreshAll() {
  return globalMutate((key) => typeof key === "string" && key.startsWith("/api/"));
}

export const useMe = () => useSWR<{ id: string; email: string }>("/api/me", fetcher, { revalidateOnFocus: false });
export const useBlocks = () => useSWR<Block[]>("/api/blocks", fetcher);
export const useTemplates = () => useSWR<DayTemplate[]>("/api/templates", fetcher);
export const useTasks = (status: "open" | "archived" = "open") => useSWR<Task[]>(`/api/tasks?status=${status}`, fetcher);
export const useDay = (date: string) => useSWR<{ day: Day | null; slots: Slot[] }>(`/api/days/${date}`, fetcher);
export const useSlots = (from: string, to: string) => useSWR<Slot[]>(`/api/slots?from=${from}&to=${to}`, fetcher);
export const useRunning = () => useSWR<Session | null>("/api/sessions?running=1", fetcher, { refreshInterval: 60_000 });

/** Sessions that started on local days [from, to]. */
export function useSessions(from: string, to: string) {
  const qs = `from=${encodeURIComponent(dayStartIso(from))}&to=${encodeURIComponent(dayStartIso(addDays(to, 1)))}`;
  return useSWR<Session[]>(`/api/sessions?${qs}`, fetcher);
}

export const useWeekStats = (start: string) =>
  useSWR<WeekStats>(`/api/stats/week?start=${start}&tz=${encodeURIComponent(tz())}`, fetcher);
export const useStreak = () => useSWR<StreakStats>(`/api/stats/streak?tz=${encodeURIComponent(tz())}`, fetcher);

/** Re-renders every `ms` so clocks and timers stay live. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function blockMap(blocks: Block[] | undefined) {
  return new Map((blocks ?? []).map((b) => [b.id, b]));
}
