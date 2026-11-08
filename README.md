# Daily Framework

The plan is the default. Decide the evening before; during the day the app says what's next.
Slots are measured by **time honoured**, never by finishing a task.

Next.js (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + auth) · installable PWA.

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`. It creates the six tables with
   row-level security and seeds every new user with the five blocks, three day templates and a few tasks.
3. `cp .env.example .env.local` and fill in the project URL and publishable (anon) key.
4. `npm install && npm run dev` and open http://localhost:3000. Create an account.

For instant sign-up while developing, turn off **Auth → Providers → Email → Confirm email** in Supabase,
and add `http://localhost:3000/auth/callback` (and your Vercel URL) to **Auth → URL configuration → Redirect URLs**
for magic links.

## Screens

| Route       | What                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| `/`         | Now (mobile home). Wide screens: Schedule, Now and Week side by side                        |
| `/plan`     | Plan tomorrow: day type → template fills slots; furthest-behind block gets the first good slot |
| `/schedule` | Day timeline (drag to move, drag bottom edge to resize; later slots shift) + week view      |
| `/review`   | End of day: planned vs actual per slot, one tap to confirm or adjust, optional mood/note    |
| `/week`     | Hours per block vs target, day-type mix, home vs outside                                    |
| `/tasks`    | Per-block task lists tagged deep / shallow                                                  |
| `/settings` | Blocks + weekly targets, editable day templates                                             |

## REST API

All routes are JSON, scoped to the signed-in user (Supabase session cookie + RLS).

```
GET    /api/me                         current user (seeds defaults if missing)
GET    /api/blocks                     POST /api/blocks       PATCH|DELETE /api/blocks/:id
GET    /api/templates                  POST /api/templates    PATCH|DELETE /api/templates/:id
GET    /api/tasks?status=&block_id=    POST /api/tasks        PATCH|DELETE /api/tasks/:id
GET    /api/days/:date                 day + slots
PUT    /api/days/:date                 freeze, place, review_done, energy_note, mood
POST   /api/days/:date/plan            { template_id, place_default, is_freeze, slots[] }
GET    /api/slots?from=&to=            POST /api/slots        PATCH|DELETE /api/slots/:id
                                       (moving/resizing pushes later slots forward)
GET    /api/sessions?from=ISO&to=ISO   GET /api/sessions?running=1
POST   /api/sessions                   start a timer (no ended_at) or log time (with ended_at)
PATCH  /api/sessions/:id               { stop: true } or field updates
POST   /api/fried                      swap to the top shallow task, start its timer
GET    /api/stats/week?start=&tz=      block progress, furthest behind, day types, place
GET    /api/stats/streak?tz=           streak, today's floor status, XP
```

Weekly totals, the furthest-behind block and the streak are computed from `sessions` and `days`, never stored.

## Rules encoded

- **Streak**: a day counts with ≥15 min (or an honoured slot) in the *streak floor* block (Job search) plus one
  other session ≥10 min. Days marked 🧊 off are skipped without breaking it. Today never breaks it.
- **XP**: 10 per hour logged.
- **Furthest behind**: lowest progress ratio among blocks with *suggest when behind* on (Sport and Social off by default).
- **Never when tired**: blocks flagged so (Learning) warn when planned in a shallow slot.
- **I'm fried**: the current slot's block's top shallow task first, then other blocks in order. Time counts to that task's block.

## v1.1

Push notifications (slot start, idle drift, plan tomorrow). `public/sw.js` already handles `push` events.
