export type Energy = "deep" | "shallow";
export type Place = "home" | "outside";
export type SlotStatus = "planned" | "honoured" | "adjusted" | "skipped";
export type SessionSource = "timer" | "manual" | "fried";

export interface Block {
  id: string;
  name: string;
  color: string;
  weekly_target_minutes: number | null;
  target_sessions: number | null;
  is_floor: boolean;
  deep_only: boolean;
  prioritize: boolean;
  sort_order: number;
}

export interface TemplateSlot {
  start: number; // minutes from midnight
  end: number;
  block_id: string;
  energy: Energy;
}

export interface DayTemplate {
  id: string;
  name: string;
  description: string | null;
  place_default: Place;
  slots: TemplateSlot[];
  sort_order: number;
}

export interface Task {
  id: string;
  block_id: string;
  title: string;
  energy: Energy;
  status: "open" | "archived";
  sort_order: number;
  created_at: string;
}

export interface Day {
  date: string; // YYYY-MM-DD
  template_id: string | null;
  place_default: Place;
  review_done: boolean;
  energy_note: string | null;
  mood: number | null;
  is_freeze: boolean;
}

export interface Slot {
  id: string;
  date: string;
  start_min: number;
  end_min: number;
  block_id: string;
  task_id: string | null;
  label: string | null;
  energy: Energy;
  status: SlotStatus;
}

export interface Session {
  id: string;
  slot_id: string | null;
  block_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  place: Place;
  source: SessionSource;
}

export interface BlockProgress {
  block_id: string;
  minutes: number;
  sessions: number;
  target_minutes: number | null;
  target_sessions: number | null;
  ratio: number; // progress / target (0..n)
  expected_ratio: number; // share of the week elapsed
}

export interface WeekStats {
  from: string;
  to: string;
  blocks: BlockProgress[];
  furthest_behind: string | null;
  day_types: { template_id: string | null; count: number }[];
  place: { home_minutes: number; outside_minutes: number; home_sessions: number; outside_sessions: number };
  per_day: { date: string; minutes: number; by_block: Record<string, number> }[];
}

export interface StreakStats {
  streak: number;
  today_counts: boolean;
  today_needs: { floor: boolean; other: boolean };
  xp: number;
  total_minutes: number;
}
