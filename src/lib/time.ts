// Time helpers shared by client and server. Slots use minutes from midnight.

export const pad = (n: number) => String(n).padStart(2, "0");

export function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${pad(m)}`;
}

export function fmtDuration(min: number) {
  min = Math.round(min);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

export function fmtHours(min: number) {
  const h = min / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

export function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toHHMM(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** Local calendar date as YYYY-MM-DD. */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** Monday of the week containing `s`. */
export function weekStart(s: string) {
  const d = parseDate(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return localDate(d);
}

export function minutesNow(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

/** Local wall time (date + minutes) → ISO timestamp, using the browser's zone. */
export function wallToIso(date: string, min: number) {
  const d = parseDate(date);
  d.setMinutes(min);
  return d.toISOString();
}

/** Start of a local day as ISO (browser zone). */
export function dayStartIso(date: string) {
  return parseDate(date).toISOString();
}

export function sessionMinutes(s: { started_at: string; ended_at: string | null }, now = Date.now()) {
  const end = s.ended_at ? Date.parse(s.ended_at) : now;
  return Math.max(0, (end - Date.parse(s.started_at)) / 60000);
}

export function dayLabel(s: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "short" }) {
  return parseDate(s).toLocaleDateString(undefined, opts);
}

/** YYYY-MM-DD of an instant in a given IANA zone. */
export function dateInZone(iso: string | number | Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}
