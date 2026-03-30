# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js)
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint via next lint
```

No test suite is configured.

## External Services

| Service | Value |
|---|---|
| Backend API (VPS) | `http://66.85.185.109` |
| Backend API (Cloudflare tunnel, in .env.local) | `NEXT_PUBLIC_API_URL` |
| WebSocket (STOMP) | `NEXT_PUBLIC_WS_URL` + `/ws-clutchhub` |
| Supabase project | `ieacinyotzoynqipfqbd.supabase.co` |
| Vercel deployment | `clutchhub-tau.vercel.app` |

All env vars are `NEXT_PUBLIC_*` (browser-visible). The Cloudflare tunnel URL in `.env.local` is a temporary tunnel and may change — the VPS IP `66.85.185.109` is the stable backend address.

## Architecture Overview

**ClutchHub** is a mobile-first (max-width ~480px) Free Fire esports tournament platform. All pages use `'use client'` — there is no SSR or server components in use.

### Auth Flow (Dual-token)

Authentication uses two layers that must stay in sync:

1. **Supabase** handles identity (email/password, OTP). After signup, Supabase sends an OTP email for verification.
2. **Custom backend JWT** is issued by `POST /auth/login` after receiving a valid Supabase session token.
3. The backend `accessToken` + `refreshToken` are stored in `localStorage` (persisted Zustand store, key: `clutchhub-auth`) and used for all API calls.
4. `src/app/providers.tsx` bootstraps auth on every page load: checks Zustand → falls back to `supabase.auth.getSession()` → exchanges for backend JWT.
5. **Token refresh** is handled automatically by the Axios response interceptor in `src/lib/api.ts` — on 401, it calls `POST /auth/refresh` and retries the failed request.

### State Management

- **Zustand** (`src/store/authStore.ts`): auth state only (user, tokens, isAuthenticated). Persisted to localStorage.
- **React Query** (`@tanstack/react-query` v5): all server data (tournaments, profile, leaderboard). Configured in `src/app/providers.tsx`.
- **Local `useState`**: form fields, UI toggles within pages.

### API Layer (`src/lib/api.ts`)

Single Axios instance with Bearer token injection and auto-refresh. Organized into namespaced objects:
- `authApi` — login, register, refresh
- `tournamentApi` — list (paginated), get by slug, create, leaderboard, updatePoints
- `teamApi` — register for tournament, get team
- `paymentApi` — createOrder, verify

### Real-time Leaderboard (`src/hooks/useLeaderboard.ts`)

Uses STOMP over SockJS. Connects to `${WS_URL}/ws-clutchhub`, subscribes to `/topic/leaderboard/{tournamentId}`. Auto-reconnects after 3s. The tournament detail page also runs a React Query poll every 10s as a fallback.

### Routing & Layout

- **Root layout** (`src/app/layout.tsx`): wraps all pages with `Providers` and the fixed `BottomNav`.
- **BottomNav** auto-hides on the `/auth` route.
- **Routes**: `/` · `/auth` · `/auth/callback` · `/auth/complete-profile` · `/tournaments` · `/tournaments/[slug]` · `/tournaments/create` · `/profile` · `/my-teams` · `/search`

### Styling

Dark gaming aesthetic with CSS custom properties defined in `src/app/globals.css`. Key variables: `--orange: #ff6b2b` (primary CTA), `--gold: #f5c842`, `--cyan: #00f5ff`. Fonts loaded from Google Fonts CDN: **Orbitron** (display/headings), **Rajdhani** (body), **Share Tech Mono** (data/mono).

Tailwind CSS v4 is used with the PostCSS plugin (`@tailwindcss/postcss`). Custom theme colors (prefixed `ch-`) are defined in `tailwind.config.ts`. Animation classes (glitch, neon glow, scanlines, pulse) are defined in `globals.css` — prefer these over inline animation styles.

### Types (`src/types/index.ts`)

Central type file. Key enums: `UserRole` (`PLAYER | ORGANIZER | ORG_HOST | ADMIN`), `TournamentStatus` (`DRAFT | OPEN | FULL | ONGOING | COMPLETED | CANCELLED`), `TeamFormat` (`SOLO | DUO | SQUAD`). API responses are typed as `ApiResponse<T>` (single) and `PageResponse<T>` (paginated list with `content`, `totalPages`, etc.).
