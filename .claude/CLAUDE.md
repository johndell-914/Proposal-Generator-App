# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000 (Next.js 16 + Turbopack)
npm run build     # Production build — run this to verify TypeScript before committing
npm run lint      # ESLint
npm run start     # Start production server (requires npm run build first)
```

There are no tests. Verify changes by running `npm run build` — TypeScript errors will surface there.

To restart the dev server on Windows, kill existing Node processes first:
```bash
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"
```

## Architecture

### Route Groups
- `(auth)` — unauthenticated pages: `/login`, `/signup`
- `(dashboard)` — session-protected pages: `/dashboard`, `/dashboard/proposals/new`, `/dashboard/proposals/[id]/edit`
- `p/[slug]` — fully public client-facing proposal page, no auth required

Route protection is handled in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, and the exported function must be named `proxy`, not `middleware`).

### Data Flow

**Creating a proposal:**
1. `NewProposalWizard` (client component) collects brief → POSTs to `/api/generate` → calls `claude-opus-4-6` → returns structured `ProposalContent` JSON
2. User reviews/edits, adds line items → POSTs to `/api/proposals` to save → redirects to editor
3. Editor (`ProposalEditor`) PATCHes `/api/proposals/[id]` on save; "Publish" sets `status: "sent"`

**Client proposal flow (`/p/[slug]`):**
1. Page server-renders from Supabase (RLS allows public read of `sent/signed/paid` proposals)
2. `ProposalViewer` handles the full interactive flow: sign → pay → success animation
3. Signing: POSTs to `/api/sign/[id]` → saves base64 PNG signature, sets `status: "signed"`
4. Payment: POSTs to `/api/stripe/checkout` → creates `PaymentIntent` → Stripe Elements collects card
5. Stripe webhook at `/api/stripe/webhook` sets `status: "paid"` on `payment_intent.succeeded`

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Shared TypeScript types: `Proposal`, `ProposalContent`, `LineItem`, `ProposalStatus` |
| `src/lib/supabase/client.ts` | Browser Supabase client (use in `"use client"` components) |
| `src/lib/supabase/server.ts` | Server Supabase client (use in Server Components and API routes) |
| `src/lib/stripe.ts` | Stripe SDK instance — API version `2026-02-25.clover` |
| `src/lib/anthropic.ts` | Anthropic SDK instance |
| `src/proxy.ts` | Auth guard — protects dashboard routes, redirects auth'd users away from login/signup |

### Supabase
- Single table: `proposals` with JSONB columns `content` (`ProposalContent`) and `line_items` (`LineItem[]`)
- `total_amount` stored in **cents** (integer)
- RLS: authenticated users manage their own rows; public can read `sent/signed/paid` rows
- Use `createClient()` from `server.ts` in API routes and Server Components; `client.ts` in client components

### Stripe
- Uses `PaymentIntent` flow (not Checkout Sessions)
- Webhook at `/api/stripe/webhook` requires raw body — do not add body parsers to that route
- `STRIPE_WEBHOOK_SECRET` is only needed in production (after Netlify deploy + webhook registration)

### AI Generation
- Model: `claude-opus-4-6` via `/api/generate`
- Returns structured JSON matching `ProposalContent` — system prompt enforces JSON-only output
- Requires authenticated user (checked server-side before calling Anthropic)

### Signature
- `react-signature-canvas` is imported directly (not via `dynamic()`) — it works fine as a direct import in `"use client"` components
- Signature stored as base64 PNG data URL in `proposals.signature_data_url`

### shadcn/ui
- Components live in `src/components/ui/`
- Add new components with: `npx shadcn@latest add <component>`
- Config in `components.json` at project root
