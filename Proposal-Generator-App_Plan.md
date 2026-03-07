# Proposal Generation Platform — Build Plan

## Context
Build a full-stack proposal generation platform similar to PandaDoc. Users (web/app dev agency) can create AI-generated proposals, share them as public URLs with clients, collect e-signatures, and process payments via Stripe. The project starts fresh in `c:\VSCodeProjects\Proposal Generator App`.

## Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth + DB**: Supabase (Auth + PostgreSQL + Storage)
- **Payments**: Stripe (PaymentIntent + Webhooks)
- **AI Generation**: Anthropic SDK — `claude-opus-4-6`
- **E-Signature**: `react-signature-canvas`
- **Animations**: Framer Motion (success celebration)
- **Hosting**: Netlify

---

## Project Structure

```
c:\VSCodeProjects\Proposal Generator App\
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          ← requires Supabase session
│   │   │   ├── page.tsx            ← proposals list dashboard
│   │   │   └── proposals/
│   │   │       ├── new/page.tsx    ← AI generation wizard
│   │   │       └── [id]/edit/page.tsx
│   │   ├── p/
│   │   │   └── [slug]/page.tsx     ← PUBLIC proposal page (no auth)
│   │   └── api/
│   │       ├── generate/route.ts           ← Anthropic call
│   │       ├── proposals/route.ts          ← CRUD
│   │       ├── proposals/[id]/route.ts
│   │       ├── sign/[id]/route.ts          ← save signature + update status
│   │       ├── stripe/checkout/route.ts    ← create PaymentIntent
│   │       └── stripe/webhook/route.ts     ← confirm payment, update status
│   ├── components/
│   │   ├── dashboard/ProposalCard.tsx
│   │   ├── proposal/
│   │   │   ├── ProposalViewer.tsx   ← renders full proposal for client
│   │   │   ├── ProposalEditor.tsx   ← inline editing in dashboard
│   │   │   └── LineItemsTable.tsx
│   │   ├── signature/SignatureModal.tsx
│   │   ├── payment/PaymentModal.tsx
│   │   └── ui/SuccessAnimation.tsx  ← Framer Motion celebration
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts    ← browser client
│       │   └── server.ts    ← server client (cookies)
│       ├── stripe.ts
│       └── anthropic.ts
├── netlify.toml
└── .env.local
```

---

## Database Schema (Supabase)

```sql
-- Run in Supabase SQL editor

create extension if not exists "uuid-ossp";

create table proposals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users not null,
  title         text not null,
  slug          text unique not null,           -- used for public URL /p/[slug]
  status        text not null default 'draft',  -- draft | sent | signed | paid
  client_name   text,
  client_email  text,
  content       jsonb not null default '{}',    -- { cover, summary, scope, timeline, terms }
  line_items    jsonb not null default '[]',    -- [{ description, quantity, unit_price }]
  total_amount  integer,                        -- cents
  signature_data_url text,
  signed_at     timestamptz,
  signed_ip     text,
  stripe_payment_intent_id text,
  paid_at       timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Row Level Security
alter table proposals enable row level security;

create policy "Users manage own proposals"
  on proposals for all
  using (auth.uid() = user_id);

create policy "Public can read sent/signed/paid proposals"
  on proposals for select
  using (status in ('sent', 'signed', 'paid'));
```

---

## User Flows

### A. Create Proposal (Dashboard User)
1. Click **"New Proposal"** on dashboard
2. Wizard Step 1: Enter client name, client email, project description (1-2 paragraphs)
3. Click **"Generate with AI"** — calls `/api/generate` with `claude-opus-4-6`
4. AI returns structured JSON: `{ cover, summary, scope, timeline, terms }`
5. Step 2: Review & edit all sections inline
6. Step 3: Add line items (description, qty, unit price) — auto-calculates total
7. Click **"Publish & Get Link"** — sets status to `sent`, shows copyable URL `/p/[slug]`

### B. Client Proposal Page (`/p/[slug]`)
1. Client opens link — no login required
2. Page renders: Cover → Executive Summary → Scope of Work → Timeline → Investment (line items) → Terms & Conditions
3. **"Sign This Proposal"** button opens `SignatureModal`
4. Client draws signature → clicks **"Apply Signature"**
5. POST `/api/sign/[id]` — saves signature data URL, records timestamp + IP, sets status → `signed`
6. Modal closes, payment prompt appears immediately
7. Client clicks **"Pay Now"** — `PaymentModal` opens with Stripe Elements
8. Payment succeeds → Stripe webhook fires → `/api/stripe/webhook` sets status → `paid`
9. **Success animation** plays (Framer Motion — confetti + checkmark)

---

## AI Generation Prompt (claude-opus-4-6)

System prompt specialized for web/app development proposals:
- Generates professional, client-facing language
- Sections: Cover headline, Executive Summary (problem + solution), Scope of Work (bulleted deliverables), Timeline (phased milestones), Terms & Conditions
- Input: `{ clientName, projectDescription, proposerName }`
- Output: structured JSON matching `content` schema

---

## Key Implementation Details

### Supabase Auth
- Email/password auth with magic link option
- Server-side session via `@supabase/ssr` package (cookies)
- Dashboard layout checks session, redirects to `/login` if missing

### Public Proposal Page
- Next.js RSC (React Server Component) fetches proposal by slug
- RLS policy allows public read of `sent/signed/paid` proposals
- Status banner shown at top (e.g., "This proposal has been signed")
- Sign button disabled if already signed; pay button hidden if already paid

### Stripe Payment Flow
- `POST /api/stripe/checkout` creates a `PaymentIntent` for `total_amount`
- Returns `client_secret` to frontend
- Frontend uses Stripe.js + `PaymentElement` to collect card details
- On `payment_intent.succeeded` webhook → update proposal `paid_at` and `status`

### Slug Generation
- `nanoid` (6-8 chars) for URL-safe unique slugs
- Example: `/p/x7kQ3m`

### E-Signature
- `react-signature-canvas` — canvas-based drawing
- Saved as base64 PNG data URL in `proposals.signature_data_url`
- Timestamp + IP stored for basic legal standing

### Success Animation
- Framer Motion `AnimatePresence` + spring animations
- Confetti burst + large animated checkmark
- "Thank you! Your proposal has been signed and payment received." message

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Netlify Deployment (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

All env vars mirrored in Netlify dashboard under Site Settings → Environment Variables.
Stripe webhook endpoint: `https://your-domain.netlify.app/api/stripe/webhook`

---

## Build Order

1. `npx create-next-app` with TypeScript + Tailwind
2. Install dependencies (supabase, stripe, anthropic, react-signature-canvas, framer-motion, shadcn/ui, nanoid)
3. Supabase: create project, run schema SQL, configure Auth
4. Stripe: create account, get keys, set up webhook
5. `.env.local` + Supabase/Stripe lib files
6. Auth pages (login/signup) + Supabase SSR middleware
7. Dashboard layout + proposals list page
8. New proposal wizard (AI generation step)
9. Proposal editor (inline editing + line items)
10. Public proposal page (`/p/[slug]`)
11. Signature modal + sign API route
12. Payment modal + Stripe API routes + webhook
13. Success animation
14. Netlify deploy + env vars + Stripe webhook URL

---

## Verification

- Log in, create a proposal, confirm AI generates all sections
- Publish → copy URL → open in incognito (no auth)
- Sign with drawn signature → confirm status updates in Supabase dashboard
- Complete Stripe test payment (card `4242 4242 4242 4242`) → confirm `paid_at` set
- Success animation plays
- Dashboard shows updated proposal status
