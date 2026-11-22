# Daily Framework

A planner for people who are tired of deciding what to do next.

You plan tomorrow the evening before. During the day the app just tells you what's next, so there are no decisions in the moment. A slot counts when you **honour the time**, not when you finish the task. Show up, do the hour, done.

## How it works

- **Blocks** are the big areas of your life (job search, learning, sport, social…). Each one has a weekly target in hours.
- **Plan tomorrow** by picking a day type. Its template fills in the slots, and whichever block is furthest behind gets the first good slot.
- **Now** shows the current slot, a timer and a quick capture. Feeling fried? One tap swaps you to an easy shallow task and the time still counts.
- **Review** at the end of the day: planned vs actual, one tap per slot, plus an optional mood and note.
- **Week** shows hours per block against target, so you can see what's slipping.
- **Streak**: a day counts if you did at least 15 min of job search plus one other session. Rest days (🧊) don't break it.

A template is a default, not a rule. Targets are starting points too, so shift them as life shifts.

Mobile first, and you can install it as an app (PWA).

## Built with

Next.js 16 · TypeScript · Tailwind v4 · Supabase (Postgres + auth) · Vercel

## Run it locally

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`. It creates the tables, row-level security and the starter blocks, templates and tasks for every new user.
3. Copy the env file and fill in your Supabase URL and publishable key:
   ```bash
   cp .env.example .env.local
   ```
4. Start it:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000 and create an account.

Tip: while developing, turn off **Authentication → Providers → Email → Confirm email** in Supabase so sign-up is instant.

## Deploy

1. Import the repo into Vercel and add the Supabase integration (or set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` yourself).
2. In Supabase → **Authentication → URL Configuration**:
   - **Site URL**: your production URL
   - **Redirect URLs**: `https://your-app.vercel.app/**`, `https://*-your-team.vercel.app/**` (previews) and `http://localhost:3000/**`
3. Push to `main` and Vercel does the rest.

<details>
<summary><strong>REST API</strong></summary>

Everything is JSON and scoped to the signed-in user (Supabase session cookie + RLS).

```
GET    /api/me                         current user (seeds defaults if missing)
GET    /api/blocks                     POST /api/blocks       PATCH|DELETE /api/blocks/:id
GET    /api/templates                  POST /api/templates    PATCH|DELETE /api/templates/:id
GET    /api/tasks?status=&block_id=    POST /api/tasks        PATCH|DELETE /api/tasks/:id
GET    /api/days/:date                 day + slots
PUT    /api/days/:date                 freeze, place, review_done, energy_note, mood
POST   /api/days/:date/plan            { template_id, place_default, is_freeze, slots[] }
GET    /api/slots?from=&to=            POST /api/slots        PATCH|DELETE /api/slots/:id
GET    /api/sessions?from=ISO&to=ISO   GET /api/sessions?running=1
POST   /api/sessions                   start a timer, or log time (with ended_at)
PATCH  /api/sessions/:id               { stop: true } or field updates
POST   /api/fried                      swap to the top shallow task and start its timer
GET    /api/stats/week?start=&tz=      block progress, furthest behind, day types, place
GET    /api/stats/streak?tz=           streak, today's floor status, XP
```

Weekly totals, the furthest-behind block and the streak are computed from sessions, never stored.

</details>

## Next up

Push notifications: when a slot starts, when I drift, and a nudge to plan tomorrow.
