# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js)
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint via next lint
```

No test suite is configured. TypeScript `strict` is off. The `supabase/` folder is
excluded from the Next TS build (its Edge Function uses Deno URL imports).

## Architecture (Supabase is the entire backend)

There is **no separate application server**. The old Java/Spring Boot backend and its
VPS were removed — the app talks **directly to Supabase** (Postgres + RLS + RPC +
Realtime + Storage + Edge Functions).

| | |
|---|---|
| **Frontend** | Next.js 14 (App Router, all client components) — Vercel `clutchhub-tau.vercel.app` |
| **Backend** | Supabase project `ieacinyotzoynqipfqbd` (region ap-northeast-1) |
| **Env** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (only these) |

Database schema, RLS, and RPCs live in `supabase/migrations/` (01→05). The certificate
generator lives in `supabase/functions/generate-certificates/` (Deno + pdf-lib).

### Auth (single token — Supabase only)

Supabase Auth is the sole identity and session. There is **no** second backend JWT
anymore. `authStore` mirrors the Supabase session; `providers.tsx` loads the session on
mount, fetches the profile row, and subscribes to `onAuthStateChange`.

- **Signup**: `supabase.auth.signUp()` → trigger creates a bare `public.users` row →
  `update_profile` RPC sets username + game UID (username uniqueness enforced there).
- **Login**: `supabase.auth.signInWithPassword()` → route to `/tournaments` (or
  `/auth/complete-profile` if the profile has no username yet).
- **Roles** live in `public.users.role`. RLS uses `SECURITY DEFINER` helpers
  (`my_role`, `is_organizer`, `is_host`, `can_manage`). Creating a tournament
  auto-upgrades a PLAYER to ORGANIZER.

### Data layer (`src/lib/data.ts`)

All reads/writes go through this module (replaces the old `api.ts`). It maps snake_case
DB rows to the camelCase shapes the UI expects. Key calls:

```
Profile      getMyProfile, updateProfile
Tournaments  listTournaments(status?), getTournament(slug), createTournament,
             updateTournamentStatus, getMyCreated, getJoined
Teams        registerTeam(tournamentId,name), getTeamsByTournament
Points       getLeaderboard, submitSimplePoints, submitDetailedPoints
Credentials  pushCredentials, getCredentials
Org hosts    assignHost, removeHost, listHosts
Certificates generateCertificates (Edge Function), myCertificates
Messaging    searchUsers, getConversations, getMessages, sendMessage
Achievements getAchievements
```

Mutations that need privilege (create tournament, register team, submit points, push
credentials, assign/remove host, update profile) are `SECURITY DEFINER` Postgres RPCs.
Simple reads use PostgREST via views: `tournaments_view` (adds organizer name),
`public_profiles` (email-free profile projection).

### Realtime (`src/hooks/`)

Supabase Realtime replaces the old STOMP/SockJS WebSocket.
- `useLeaderboard(tournamentId)` — subscribes to `points` changes, refetches the
  `get_leaderboard` RPC.
- `useRoomCredentials(tournamentId)` — subscribes to `room_credentials` changes (RLS
  restricts this to registered team leaders + managers).

### Certificates

`generate-certificates` Edge Function (verify_jwt on). Organizer-only. Renders a PDF per
player in the top-N teams with pdf-lib, uploads to the `certificates` Storage bucket, and
inserts `public.certificates` rows.

## Canonical enums (keep frontend + DB in sync)

- `tournament_status`: `DRAFT | UPCOMING | LIVE | COMPLETED | CANCELLED`. Registration is
  open while `UPCOMING`. (The old `OPEN/ONGOING/FULL` values are gone — they were the
  cause of the "Join button never shows" bug.)
- `team_format`: `SOLO | DUO | SQUAD`. `game_type`: `FREE_FIRE | BGMI | VALORANT | COD_MOBILE | OTHER`.
- `team_status`: `PENDING_PAYMENT | CONFIRMED | DISQUALIFIED` — new registrations are
  `CONFIRMED` (payments are out of scope).

## Payments

Out of scope. No Razorpay tables, no entry-fee collection. `entry_fee` is display-only.

## Routes

`/` landing · `/auth` login+signup · `/auth/callback` magic-link · `/auth/complete-profile`
· `/tournaments` list · `/tournaments/[slug]` detail (join, live leaderboard, room creds)
· `/tournaments/[slug]/host` host panel (creds, points, certificates, hosts) ·
`/tournaments/create` wizard · `/my-teams` · `/profile` · `/search` (DMs).

## Styling

CSS custom properties in `globals.css` are the source of truth (`--red`, `--green`,
`--amber`, `--surface`, `--text*`, etc.). Fonts: Space Grotesk + Space Mono. Pages use
inline `style` objects for layout + `globals.css` classes for animations.

## Files

```
src/
├── app/                      # pages (all 'use client')
├── components/layout/BottomNav.tsx, tournament/TournamentCard.tsx
├── hooks/useLeaderboard.ts, useRoomCredentials.ts
├── lib/supabase.ts           # single Supabase client + auth helpers
├── lib/data.ts               # the entire data layer
├── store/authStore.ts        # Zustand (user, isAuthenticated, ready)
└── types/index.ts
supabase/
├── migrations/01_schema … 05_harden.sql
└── functions/generate-certificates/index.ts
```
