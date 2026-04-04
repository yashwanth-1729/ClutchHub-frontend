# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm run dev       # Start dev server (Next.js)
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint via next lint
```

No test suite is configured. TypeScript strict mode is off (`"strict": false` in tsconfig).

### Backend (SSH into VPS)
```bash
cd /opt/clutchhub/app
mvn clean package -DskipTests
systemctl restart clutchhub.service
```

Spring Boot app runs as a systemd service. After any backend change: build → restart. Logs: `journalctl -u clutchhub.service -f`.

## Infrastructure

| | |
|---|---|
| **Backend** | Spring Boot on VPS `66.85.185.109:8080` |
| **Frontend** | Vercel — `clutchhub-tau.vercel.app` |
| **Supabase project** | `ieacinyotzoynqipfqbd.supabase.co` |
| **API base URL** | `http://66.85.185.109:8080/api` (`NEXT_PUBLIC_API_URL`) |
| **WebSocket** | `ws://66.85.185.109:8080/ws` (`NEXT_PUBLIC_WS_URL`) |

All env vars are `NEXT_PUBLIC_*` (browser-visible). No server-side secrets exist — this is a fully client-rendered app (`'use client'` on every page, no SSR/RSC).

Port 8080 on the VPS may be behind a firewall. If direct API calls fail, the backend may need to be exposed via a Cloudflare tunnel (update both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in `.env.local` and redeploy to Vercel).

---

## Architecture

### Stack
- **Next.js 14** (App Router, all client components)
- **Zustand 5** — auth state only, persisted to localStorage (key: `clutchhub-auth`)
- **TanStack React Query v5** — all server/async data
- **Axios** — HTTP client with interceptors in `src/lib/api.ts`
- **Supabase JS v2** — identity provider
- **STOMP/SockJS** — WebSocket for live leaderboard
- **Tailwind CSS v4** (PostCSS plugin) + CSS custom properties in `globals.css`

### Auth Flow (Dual-token — critical to understand)

ClutchHub uses **two token systems in parallel**:

1. **Supabase** manages identity (email/password, OTP magic link). Produces a Supabase `access_token` (JWT).
2. **Backend** issues its own `accessToken` + `refreshToken` JWT pair. All API calls use the backend token, not the Supabase token.

**Full flow:**
```
Signup:  supabase.auth.signUp() → POST /auth/register → POST /auth/login
Login:   supabase.auth.signInWithPassword() → POST /auth/login { firebaseIdToken: supabase_access_token }
         ← { accessToken, refreshToken, userId, role, profileComplete }
         → authStore.setAuth() writes to Zustand + localStorage['accessToken'] + localStorage['refreshToken']

Reload:  providers.tsx checks Zustand → if not authenticated, supabase.auth.getSession()
         → exchange with POST /auth/login (raw fetch, not axios) → setAuth()

401:     api.ts interceptor → POST /auth/refresh → retry original request
         If refresh fails → localStorage.clear() + redirect /auth

Logout:  supabase.auth.signOut() + authStore.logout() (clears Zustand + localStorage)
```

**Token storage split:** tokens live in both `localStorage['accessToken']` (read by Axios interceptor) AND inside the Zustand persisted blob (`clutchhub-auth`). `setAuth()` and `logout()` write both simultaneously — they must stay in sync.

The Axios request interceptor reads from `localStorage` directly, not from Zustand, so token updates during refresh are immediately effective without a store update.

### API Layer (`src/lib/api.ts`)

Single Axios instance. Namespaced exports:

```
authApi        login, register, refresh, completeProfile
tournamentApi  list(page,size,status), get(slug), create(data), leaderboard(id), updatePoints(id,data)
teamApi        register(tournamentId,data), get(tournamentId)
userApi        search(q), conversations(), getMessages(userId), sendMessage(userId,content)
paymentApi     createOrder(data), verify(data)
```

`authApi.login` sends `{ firebaseIdToken }` — the field is named `firebaseIdToken` for legacy reasons but contains the Supabase JWT.

### State Management

- **Zustand** (`src/store/authStore.ts`): `user`, `accessToken`, `refreshToken`, `isAuthenticated`. Methods: `setAuth()`, `setUser()`, `logout()`.
- **React Query**: configured in `providers.tsx` with `staleTime: 30000`, `retry: 1`. Used in tournament pages and profile.
- **useState**: all form fields and UI toggles within individual pages.

### Real-time Leaderboard (`src/hooks/useLeaderboard.ts`)

STOMP client over SockJS. Endpoint: `${NEXT_PUBLIC_WS_URL}/ws-clutchhub`. Subscribes to `/topic/leaderboard/{tournamentId}`. Auto-reconnects after 3s. Tournament detail page additionally polls `GET /leaderboard/{id}` every 10s as fallback.

### Routing & Layout

Root layout (`src/app/layout.tsx`) wraps everything with `<Providers>` (React Query) and `<BottomNav>`. BottomNav hides on `/auth` and `/auth/callback`.

### Styling System

CSS custom properties in `globals.css` are the source of truth for colors and fonts:
```
--orange: #ff6b2b   (primary CTAs, active states)
--gold:   #f5c842   (prize pool, secondary accent)
--cyan:   #00f5ff   (WebSocket live indicator, hover accents)
--magenta:#ff00aa   (gradients)
--bg:     #030308   (page background)
--surface:#0d0d1a   (card background)
--border: #1a1a35
--text:   #e8e8ff
--text-dim:#8888aa
```
Fonts: **Orbitron** (`var(--font-display)`) for headings, **Rajdhani** (`var(--font-body)`) for body, **Share Tech Mono** (`var(--font-mono)`) for data/labels. All loaded from Google Fonts CDN in `globals.css`.

Animation classes (`pageEnter`, `glitch`, `livePulse`, `neon-text-orange`, etc.) are defined in `globals.css` — use these rather than inline styles for animations.

Most pages use inline `style={{}}` objects for layout and dynamic styling, with `globals.css` classes for animations and Tailwind for occasional utilities. Both patterns coexist.

---

## User Roles

| Role | Capabilities |
|---|---|
| `PLAYER` | Browse tournaments, join tournaments, view leaderboards, chat (1:1 messaging) |
| `ORGANIZER` | Everything PLAYER can do + create tournaments, assign ORG_HOST users to their tournaments, manage tournament settings |
| `ORG_HOST` | Manage only tournaments they have been explicitly assigned to: push room ID/password, enter match points, update leaderboard |
| `ADMIN` | Full platform access |

**Current frontend role enforcement:** None. Any authenticated user can navigate to `/tournaments/create` and submit the form. The backend rejects non-organizers with 403 but the frontend shows no role-gated UI. Role checks need to be added using `useAuthStore().user.role`.

---

## All Routes

### `/` — Landing page
Static marketing page. Hero with glitch animation, fake hardcoded stats (player count, tournament count, prize pool — not fetched from API), feature grid, CTAs to `/auth` and `/tournaments`. No API calls.

### `/auth` — Login / Signup
Toggle between LOGIN and SIGN UP modes. Signup collects email, password, username, Free Fire UID — calls `POST /auth/register` then `POST /auth/login`. Login calls `POST /auth/login` directly. Redirects to `/tournaments` on success. Auto-switches to LOGIN tab on 409 (duplicate email). No auth guard — already-authenticated users are not redirected away.

### `/auth/callback` — OAuth / magic link callback
Handles Supabase redirect. Gets session → `POST /auth/login` → if `profileComplete === false` redirect to `/auth/complete-profile`, else `/tournaments`.

### `/auth/complete-profile` — First-time profile setup
Collects username, displayName, gameUid. Calls `POST /auth/complete-profile`. No auth guard on page load — if an unauthenticated user lands here and submits, the interceptor will handle the 401.

### `/tournaments` — Tournament listing
Fetches `GET /tournaments?page=0&size=10`. Filter tabs (ALL / UPCOMING / LIVE / COMPLETED) filter the already-fetched first page client-side — no filter params sent to backend, no pagination. Uses `TournamentCard` component. No auth gate.

### `/tournaments/[slug]` — Tournament detail
Fetches `GET /tournaments/{slug}`. Three tabs:
- **INFO** — game, format, maxTeams, registeredTeams, organizer, scheduledAt, description
- **LEADERBOARD** — `GET /leaderboard/{id}` polled every 10s + live via WebSocket
- **RULES** — raw text

Join button (only shown for `OPEN` status) calls `POST /tournaments/{id}/teams`. **Broken:** no team name input exists before the join call — the team name sent is undefined/empty.

### `/tournaments/create` — Create tournament
3-step wizard: (1) title, description, rules; (2) format, maxTeams, entryFee, prizePool, scheduledAt; (3) review. Submits `POST /tournaments`. **No frontend role gate** — PLAYER role users can reach and submit this form.

### `/my-teams` — My Battles dashboard
Fetches `GET /tournaments/my-joined` (JOINED tab) and `GET /tournaments/my-created` (CREATED tab). Auth-gated (redirects to `/auth`). **Broken:** the JOINED tab currently fails or returns empty — the endpoint or its integration needs verification. Create button navigates to `/tournaments/create`.

### `/profile` — User profile
Fetches `GET /users/me`. Edit mode allows updating username, gameUid, gender, gameRole, bio via `PUT /users/me`. Action buttons navigate to `/my-teams`, `/tournaments/create`, `/search`. Logout calls `supabase.auth.signOut()` + `authStore.logout()`.

### `/search` — COMMS / Messaging
Two tabs: SEARCH (user search by username, `GET /users/search?q=`) and CHATS (conversation list, `GET /users/conversations`). Clicking a user opens a chat view: messages fetched via `GET /users/messages/{userId}`, polled every 5s via `setInterval`. Send via `POST /users/messages/{userId}`. Auth-gated.

---

## All API Endpoints

| Method | Endpoint | Called From | Status |
|---|---|---|---|
| `POST` | `/auth/register` | `/auth` | Working |
| `POST` | `/auth/login` | `/auth`, `/auth/callback`, `providers.tsx` | Working |
| `POST` | `/auth/refresh` | `api.ts` interceptor (automatic) | Working |
| `POST` | `/auth/complete-profile` | `/auth/complete-profile` | Working |
| `GET` | `/tournaments` | `/tournaments` | Working |
| `GET` | `/tournaments/{slug}` | `/tournaments/[slug]` | Working |
| `POST` | `/tournaments` | `/tournaments/create` | Working |
| `GET` | `/tournaments/my-joined` | `/my-teams` | Broken / unverified |
| `GET` | `/tournaments/my-created` | `/my-teams` | Working |
| `POST` | `/tournaments/{id}/teams` | `/tournaments/[slug]` (join) | Broken (no team name input) |
| `GET` | `/leaderboard/{id}` | `/tournaments/[slug]` | Working |
| `POST` | `/tournaments/{id}/points` | `api.ts` only — no UI | Not implemented |
| `GET` | `/users/me` | `/profile` | Working |
| `PUT` | `/users/me` | `/profile` | Working |
| `GET` | `/users/search` | `/search` | Working |
| `GET` | `/users/conversations` | `/search` | Working |
| `GET` | `/users/messages/{userId}` | `/search` | Working |
| `POST` | `/users/messages/{userId}` | `/search` | Working |
| `POST` | `/payments/order` | `api.ts` only — no UI | Not implemented |
| `POST` | `/payments/verify` | `api.ts` only — no UI | Not implemented |
| `WS` | `/ws-clutchhub` → `/topic/leaderboard/{id}` | `useLeaderboard` hook | Working |

---

## Known Bugs & Incomplete Features

### Bugs to Fix

**Join tournament — no team name input** (`/tournaments/[slug]`)
The Join button calls `POST /tournaments/{id}/teams` immediately with no UI to collect a team name. Need a modal that prompts for team name before the POST fires. Backend requires `{ name: string }` in the body. For SOLO format the team name could default to the player's display name.

**My Teams JOINED tab — wrong endpoint** (`/my-teams`)
The page calls `GET /tournaments/my-joined` but the correct backend endpoint is `GET /tournaments/joined`. This is why the joined tab always shows empty state even after successfully registering for a tournament. Fix: change the endpoint string in `/my-teams/page.tsx`.

**useLeaderboard WS fallback URL missing port** (`src/hooks/useLeaderboard.ts`)
The hardcoded fallback is `'http://66.85.185.109/ws'` — missing `:8080`. Change to `'ws://66.85.185.109:8080/ws'`.

**Tournament filter only covers first page** (`/tournaments`)
Fetches `page=0&size=10` once and filters client-side. With >10 tournaments, filtered views are incomplete. Pass `status` as a query param to `GET /tournaments` and add pagination UI.

**No auth guard on `/tournaments/create`**
Any PLAYER can reach and submit the form. Add a role check: redirect or show an error if `user.role` is not `ORGANIZER` or `ADMIN`.

**Homepage stats are fake**
Player count, tournament count, and prize pool on `/` are hardcoded strings. No API endpoint called.

### Pending Features

---

#### Host Assignment
**What it does:** An ORGANIZER assigns a trusted user (who has `ORG_HOST` role) to a specific tournament. The ORG_HOST then gets access to the host panel for that tournament only — they cannot manage any other tournament.

**What needs building:**
- UI in tournament management (accessible to ORGANIZER on their tournament's detail page or a manage page) to search for a user and assign them as host
- Backend endpoint to persist the assignment (tournament ↔ user mapping)
- Frontend host panel gated by checking: `user.role === 'ORG_HOST'` AND the tournament's assigned host ID matches the current user

---

#### Host Panel
**What it does:** A dedicated management view inside the tournament detail page (tab or sub-route, e.g. `/tournaments/[slug]/host`), visible only to the assigned ORG_HOST and the ORGANIZER who created the tournament.

**Features inside the host panel:**

1. **Push room credentials** — Host enters Room ID and Room Password, sends via WebSocket so all registered players receive it in real time. Players see a "ROOM DETAILS" section appear on the tournament detail page once pushed.

2. **Match points entry** — Two modes toggled by the host:
   - **Simple mode:** Enter total points per team directly (one number per team).
   - **Detailed mode:** Enter per-player kills + team placement → frontend calculates total using a configurable formula (e.g. `kills × 1pt + placement points from a standard table`). Overall team total is always compulsory regardless of mode.
   - After entry, submit calls `tournamentApi.updatePoints(tournamentId, data)` — this endpoint already exists in `api.ts`.
   - On submit, the leaderboard updates via WebSocket push to all connected clients.

**What needs building:**
- New tab or route for the host panel within tournament detail
- Room credentials push UI + WebSocket publish (new STOMP destination, e.g. `/app/room/{tournamentId}`)
- Players subscribe to `/topic/room/{tournamentId}` to receive room details
- Points entry form (simple + detailed modes) with per-team rows
- Points calculation logic in the frontend for detailed mode
- Role + assignment gate on the panel route

---

#### Payment Flow
`paymentApi.createOrder(data)` and `paymentApi.verify(data)` are defined in `api.ts` but called nowhere. Entry fee collection is entirely missing.

**What needs building:** A payment step inserted into the join flow — after the team name modal, before `POST /tournaments/{id}/teams`. For paid tournaments (`entryFee > 0`): call `POST /payments/order` → handle payment gateway → call `POST /payments/verify` → then register team.

---

#### E-Certificates
**What it does:** After a tournament is marked COMPLETED, the host selects the top N teams (winner, runner-up, etc.). The backend uses **iText7** to generate a PDF certificate per player. PDFs are stored in **Cloudinary** and the URL is saved in a `certificates` table in the database.

**What needs building (frontend):**
- Host panel action: "Generate Certificates" — select top N teams, submit to backend endpoint
- Download button on tournament detail page for COMPLETED tournaments (visible to players who have a certificate)
- The certificate URL comes from the backend; the frontend just fetches and links to it

---

#### Achievements & Certificates on Profile
**What it does:** A new section on `/profile` showing:
- All past tournaments the user participated in (with result/placement)
- All earned certificates with a download button (links to Cloudinary PDF URL)

**What needs building:**
- New section in `/profile/page.tsx` below current profile info
- API calls: `GET /users/me/tournaments` (past tournaments) and `GET /users/me/certificates` (earned certs)
- Certificate card component with tournament name, placement badge, download link
- These endpoints do not yet exist in `api.ts` — add to `userApi`

---

---

## Backend — What Needs To Be Built

The backend is Spring Boot. The following controllers and services are pending. Entity classes and repositories already exist where noted — only the service + controller layer needs to be added.

### 1. OrgHost Assignment (`/api/org-hosts`)

Entity + Repository already exist. Need controller + service.

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/org-hosts` | `{ tournamentId, userId }` | Assign a user as ORG_HOST for a tournament |
| `DELETE` | `/api/org-hosts/{id}` | — | Remove a host assignment |
| `GET` | `/api/org-hosts/{tournamentId}` | — | List all hosts assigned to a tournament |

Security: only the tournament creator (ORGANIZER) can assign or remove hosts for their own tournament. Backend should verify `tournament.createdBy == currentUser`.

---

### 2. Points Entry (`/api/points/{tournamentId}`)

Endpoint already exists. Two modes determined by request body shape:

**Simple mode** — body: `{ teamId, matchNumber, totalPoints }`
- Save directly to points table.

**Detailed mode** — body: `{ teamId, matchNumber, placement, players: [{ userId, kills }] }`
- Look up `placementPoints` from `placement_rules` table using `placement` value.
- Calculate `killPoints` = sum of all player kills × kill point value (stored in placement_rules or a config table).
- `totalPoints = placementPoints + killPoints`
- Save to points table.
- After save: broadcast updated leaderboard via WebSocket to `/topic/leaderboard/{tournamentId}`.

Overall team total is compulsory in both modes. The leaderboard WebSocket push must happen after every points save so connected clients update in real time.

---

### 3. Certificates (`/api/certificates`)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/certificates/{tournamentId}` | `{ topN: 3 }` | Generate certificates for top N teams |
| `GET` | `/api/certificates/my` | — | Authenticated player gets their own certificates |
| `GET` | `/api/certificates/{tournamentId}` | — | List all certificates for a tournament |

**`POST` service logic (per-player, for all players in top N teams):**
1. Query leaderboard to get top N teams and their final ranks.
2. For each player in those teams:
   - Generate PDF using **iText7** (dependency already installed in pom.xml).
   - PDF content: player name, tournament name, rank, total points, date.
   - Upload PDF to **Cloudinary** (credentials already configured on backend).
   - Save Cloudinary URL + metadata to `certificates` table.

Security: only the assigned ORG_HOST or ORGANIZER of the tournament can call `POST`. `GET /my` is available to any authenticated user.

---

### 4. Achievements (`/api/users/achievements`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/achievements` | Returns all tournaments participated in + ranks + certificates for the authenticated user |

**Response should include:**
- All tournaments the user participated in, queried via `team_players` table → team → tournament.
- Their team's final rank in each completed tournament (from leaderboard/points tables).
- Any certificates earned (from `certificates` table where `userId = currentUser`).

This single endpoint powers the Achievements section on the frontend profile page.

---

## Frontend — What Needs To Be Built (Corresponding to Backend Above)

Once the above backend endpoints exist, these frontend pieces need to be built:

**`api.ts` additions needed:**
```typescript
// Add to userApi:
achievements: () => api.get('/users/achievements'),
certificates: () => api.get('/certificates/my'),

// New orgHostApi:
orgHostApi = {
  assign: (tournamentId, userId) => api.post('/org-hosts', { tournamentId, userId }),
  remove: (id) => api.delete(`/org-hosts/${id}`),
  list: (tournamentId) => api.get(`/org-hosts/${tournamentId}`),
}

// New certificateApi:
certificateApi = {
  generate: (tournamentId, topN) => api.post(`/certificates/${tournamentId}`, { topN }),
  forTournament: (tournamentId) => api.get(`/certificates/${tournamentId}`),
}

// New pointsApi:
pointsApi = {
  submitSimple: (tournamentId, data) => api.post(`/points/${tournamentId}`, data),
  submitDetailed: (tournamentId, data) => api.post(`/points/${tournamentId}`, data),
}
```

**New routes/components needed:**
- `/tournaments/[slug]/host` — Host panel (points entry + room credentials push), gated to `ORG_HOST` and `ORGANIZER` roles
- Achievements section in `/profile` — past tournaments + certificate download cards
- Team name modal in `/tournaments/[slug]` — shown before join POST fires
- Host assignment UI — on ORGANIZER's tournament manage view (search user → assign as host)

## Files Reference

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: Providers + BottomNav
│   ├── providers.tsx                 # React Query setup + session restore on load
│   ├── globals.css                   # All CSS variables, animations, utility classes
│   ├── page.tsx                      # Landing page (/)
│   ├── auth/
│   │   ├── page.tsx                  # Login + Signup
│   │   ├── callback/page.tsx         # Supabase OAuth callback
│   │   └── complete-profile/page.tsx # First-time profile setup
│   ├── tournaments/
│   │   ├── page.tsx                  # Tournament listing with filters
│   │   ├── [slug]/page.tsx           # Tournament detail + leaderboard + join
│   │   └── create/page.tsx           # 3-step create wizard
│   ├── my-teams/page.tsx             # Joined + created tournaments dashboard
│   ├── profile/page.tsx              # User profile view + edit
│   └── search/page.tsx               # User search + 1:1 messaging
├── components/
│   ├── layout/BottomNav.tsx          # Fixed 5-tab bottom navigation
│   └── tournament/TournamentCard.tsx # Reusable tournament card (used in listing)
├── hooks/
│   └── useLeaderboard.ts             # STOMP WebSocket hook for live leaderboard
├── lib/
│   ├── api.ts                        # Axios instance + all API namespaces
│   ├── supabase.ts                   # Supabase client + signInWithMagicLink, signOut, getSession
│   └── supabase-client.ts            # Singleton Supabase client factory — currently unused (dead code)
├── store/
│   └── authStore.ts                  # Zustand auth store (persisted)
└── types/
    └── index.ts                      # All TypeScript interfaces and enums
```
