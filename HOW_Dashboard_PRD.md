# HOW Bangkok Member Dashboard
## Product Requirements Document

| | |
|---|---|
| **Version** | 2.0 — Updated to Current State |
| **Date** | 17 May 2026 |
| **Author** | HOW Bangkok Operations Team |
| **Status** | Live (Static) — Pending Phase 2 |
| **Platform** | https://howbkkdb.web.app (Firebase Hosting) |
| **Previous Version** | v1.0 (4 May 2026) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System — What's Live (v1.0)](#2-current-system--whats-live-v10)
3. [Tab-by-Tab Feature Specification](#3-tab-by-tab-feature-specification)
4. [Cross-Tab Features](#4-cross-tab-features)
5. [Data Model (Static)](#5-data-model-static)
6. [Phase 2 — Authentication](#6-phase-2--authentication)
7. [Phase 3 — Live Database Integration](#7-phase-3--live-database-integration)
8. [Phase 4 — Full CRM Features](#8-phase-4--full-crm-features)
9. [Database Schema (v2)](#9-database-schema-v2)
10. [Milestones & Timeline](#10-milestones--timeline)
11. [Open Questions](#11-open-questions)
12. [Appendix](#12-appendix)

---

## 1. Executive Summary

HOW Bangkok is a premier coworking community in Bangkok with 207+ active paid members across individual and corporate membership tiers. The HOW Bangkok Member Dashboard (`howbkkdb.web.app`) is an internal operations and management tool that gives the team real-time visibility into:

- **Membership status** — active, expiring, expired, vintage distribution, price tier breakdown
- **New Sales pipeline** — lead funnel stages, source/channel analytics, lead list
- **Renewal management** — renewal pipeline, churn tracking, month-over-month renewal rate
- **Historical analytics** — cohort retention, member growth over time
- **Executive view** — scenario simulation, target calculator, risk alerts
- **Member directory** — filterable/sortable member table with health scores, P&L snapshot

### Current Status (v1.0 — Live)

The dashboard runs as a **single-page HTML application** (`index.html`) deployed on Firebase Hosting. All data is **hardcoded in JavaScript arrays**, manually synced from Excel. There is currently **no authentication** and **no live database**.

### Roadmap Summary

| Phase | Scope | Status |
|---|---|---|
| **v1.0** | 6-tab dashboard with static data, all analytics features | ✅ **Live** |
| **Phase 2** | Firebase Authentication — restrict to `@howbangkok.com` | 🔲 Next |
| **Phase 3** | Live Database — Supabase backend, replace static arrays | 🔲 Planned |
| **Phase 4** | Full CRM — tasks, payments, events, tags | 🔲 Future |

---

## 2. Current System — What's Live (v1.0)

### 2.1 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Single-file HTML (`index.html`) + vanilla JavaScript + Chart.js v4.4 |
| Hosting | Firebase Hosting — Project: `howbkkdb` |
| URL | https://howbkkdb.web.app |
| Deployment | `firebase deploy --only hosting` (CLI, account: `benz@howbangkok.com`) |
| Charts | Chart.js CDN — doughnut, bar, line |
| Authentication | **None** — URL is currently public |
| Database | **None** — all data hardcoded in JS arrays in `index.html` |

### 2.2 Data Sources (Current)

All data is manually maintained as JavaScript constants in `index.html`. Source files:

| Constant | Source File | Description |
|---|---|---|
| `MEMBERS` | `Copy of HOW Member Status.xlsx` → `new by tata` sheet | All active + expired members, ~300+ entries |
| `EXPIRED_MEMBERS` | Same Excel | 90 expired members with endDate for churn calculation |
| `RENEWALS` | `Expiring Member.xlsx` → `Q1-2026` sheet | Members in renewal pipeline, status, Director POC |
| `LEADS` | `Copy of Leads_HOW_2026.xlsx` | 14 lead records with stage, source, outcome |
| `RENEW_BY_MONTH` | `Copy of HOW Member Status.xlsx` → `2026(mimp)` | Monthly renewal counts (ต.ค.68–พ.ค.69) |
| `PRICE_TIERS_2026` | `Copy of HOW Member Status.xlsx` → `2026(mimp)` | 6 price tiers from YTD 2026 payment records |
| `EXPIRED_MEMBERS` | Manual + Excel | 90 expired member records used for churn/MTD stats |

### 2.3 Target Users

| Role | Primary Use |
|---|---|
| Operations Manager | All tabs — membership health, renewal tracking, reporting |
| Sales / Community Manager | Tab ② New Sales, Tab ③ ต่ออายุ — pipeline management |
| Finance | Tab ⑤ Executive View — P&L scenario, revenue forecast |
| Director / Executive | Tab ⑤ Executive View — KPIs, risk alerts, scenario simulation |

---

## 3. Tab-by-Tab Feature Specification

The dashboard has **6 tabs** with a sticky top navigation bar. Each tab has a **sticky section navigation bar** (`.snav`) directly below the tab bar, with jump buttons to each section within that tab.

---

### Tab ① สมาชิก (Member Overview)

**Purpose:** Top-level membership health — active member counts, growth trends, price tier distribution, and expiring member tracking.

#### Sections

| Section | Anchor | Description |
|---|---|---|
| Hero KPIs Row 1 | — | Total active members, Paid count, Barter count, Invitation count |
| Hero KPIs Row 2 | — | YTD: New members, Renewed, Churn YTD, Renew Rate YTD |
| Hero KPIs Row 3 | — | MTD block with toggle (rolling 30 days / specific month) |
| Vintage Buckets | `anc-vintage` | Paid members grouped by time remaining: <30d / 30-90d / 90-180d / 180-365d / 365+d |
| Membership Tiers | `anc-tiers` | Price tier breakdown (฿350k/฿420k/฿380k/฿650k/฿720k/varies/ไม่ระบุ) with Bar or Donut chart toggle |
| Expiring Soon | `anc-expiring` | Table of paid members approaching expiry — default filter: current month |

#### MTD Toggle (Row 3)

- **⟳ 30 วัน (rolling)** — computes stats from a rolling 30-day window ending today
- **📅 รายเดือน** — shows month picker (ต.ค.68 → พ.ค.69); selecting a month updates all 4 MTD stats simultaneously
- Stats updated: Expired MTD, Renewed MTD, Churn MTD, Renew Rate MTD

#### Membership Tiers Card

- Data source: `PRICE_TIERS_2026` static constant derived from `2026(mimp)` Excel sheet
- 6 known price tiers (YTD 2026): ฿350k (34 คน), ฿420k (10), ฿380k (7), ฿650k (2), ฿720k (1), varies (5)
- "ไม่ระบุ/เก่า" bucket = `PAID_ACTIVE.length - 59` (members with no 2026 payment record)
- **Chart toggle:** 📊 Bar (horizontal bars, relative scale within known tiers) | 🍩 Donut (Chart.js doughnut of 6 known tiers)
- Revenue displayed: YTD 2026 known total = ฿22.59M
- Proportion bar: shows known vs unknown split at a glance

#### Expiring Soon Table

- Source: `MEMBERS` array filtered to `PAID_TYPES` (Renew, Fellow, Distinguish) with `daysLeft > 0`
- **Default filter: current month** (พ.ค. = month 5 at launch)
- Year filter (2569 / 2570) + Month filter (ม.ค.–ธ.ค.) — multi-select
- Sortable columns: Nickname, Type, End Date, Days Left, Price
- Shows ALL matching members (no row limit)

---

### Tab ② New Sales

**Purpose:** Lead pipeline management — tracking prospects from first contact through to paid membership.

#### Sections

| Section | Anchor | Description |
|---|---|---|
| YTD KPIs | `anc-sales-kpi` | Leads YTD, Paid YTD (3), Active in pipeline, Hot/Warm/Cold breakdown |
| MTD Block | — | MTD toggle: Lead In MTD + Paid MTD + Overdue count |
| Stage Pipeline | `anc-pipeline` | Visual funnel — 7 stages (0→5 + Reject separated by dashed divider) |
| ช่องทาง Lead | `anc-source` | Source/channel cards (clickable filter) + donut chart (full-width, below cards) |
| Lead List | `anc-leads` | Full lead table with filters |

#### Stage Pipeline

- 7 stages: 1st Contact → 2nd Contact → Director Contact → Considering → Billing → Paid → Reject
- **Reject** is counted from `outcome === 'no'` (not stageIdx), shown below main flow with dashed separator
- Filter buttons auto-generated including a Reject button (styled in alert color)
- Pipeline node color: gold (active) / green (Paid) / red (Reject)

#### MTD Toggle

- **⟳ rolling**: Lead In = leads with `firstDate >= 30 days ago`; Paid = leads with `outcome='paid'` and `lastDate >= 30 days ago`
- **📅 รายเดือน**: filter by `firstDate.startsWith(ym)` / `lastDate.startsWith(ym)` for the selected month
- Overdue metric stays as a standing snapshot (leads with no contact >60 days) — not affected by MTD mode

#### Source/Channel Section

- Cards show each source with count + % of total, clickable to filter Lead List
- Active filter card shows colored border + "● กำลัง filter" indicator
- Donut chart (full-width, 300px height): displays proportional breakdown of all leads by source, legend on right with count + %

#### Lead List Table

- Columns: #, ชื่อ, Stage, ช่องทาง, Label, Last Contact, Days Since, Status
- Multi-dimension filters: Stage buttons, Label buttons, Source cards
- Active filter = highlighted button / card
- Clicking Reject stage button filters to `outcome === 'no'` leads

---

### Tab ③ ต่ออายุ / หมดสัญญา (Renewal)

**Purpose:** Track the full renewal lifecycle — from upcoming expiries through renewal outcomes, pipeline status, and expired member management.

#### Sections

| Section | Anchor | Description |
|---|---|---|
| YTD KPIs | `anc-rw-stats` | Expired YTD, Renewed YTD (42), Churn YTD, Renew Rate YTD |
| MTD Block | — | MTD toggle (rolling / month) → Expired MTD, Renewed MTD, Churn MTD, Renew Rate MTD |
| Hot/Warm/Cold | — | Members expiring <30d / 30–90d / 90+d — urgency breakdown |
| Renewal Trend Chart | `anc-rw-trend` | Bar chart: Expired vs Renewed by month (ต.ค.68–พ.ค.69) |
| Renewal Pipeline | `renewal-pipeline-card` | YTD 2026 pipeline funnel: Renewed / Billing / Considering / Not Renewing / Transferred |
| Renewal Table | `anc-rw-table` | Members in active renewal management — filterable by stage/label/outcome |
| Expired Members | `anc-rw-expired` | All 90 expired members — full table, sortable |
| Renewal Rate Chart | `anc-rw-ratechart` | Monthly % chart — target line at 90% |

#### MTD Toggle

- **⟳ rolling**: Expired = `EXPIRED_MEMBERS` filtered to last 30 days; Renewed = sum of `RENEW_BY_MONTH` entries within rolling window
- **📅 รายเดือน**: Expired = `EXPIRED_MEMBERS.endDate.startsWith(ym)`; Renewed = `RENEW_BY_MONTH[ym]`
- All 4 cards update simultaneously when mode or month changes

#### Renewal Pipeline Title

- Labeled "YTD 2026 (ม.ค.–เม.ย. จาก Excel)" to clarify data source and period

---

### Tab ④ Cohort & Retention *(beta)*

**Purpose:** Historical analysis — member cohort retention, growth trends, longevity tracking.

#### Sections

| Section | Anchor | Description |
|---|---|---|
| KPIs | `anc-hist-kpi` | Summary stats: founding year, total member-years, avg tenure |
| Cohort Table | `anc-hist-cohort` | Members grouped by join year — count, still active, retention % |
| 1Y vs 3Y Retention | — | Bar comparison: 1-year vs 3-year membership retention rates |
| HOW in Numbers | — | Key milestones and totals |
| New vs Expired Trend | — | Monthly chart: new members vs expired members |
| Longevity Chart | — | Members sorted by days as a member — top longevity ranking |

---

### Tab ⑤ มุมมองผู้บริหาร (Executive View)

**Purpose:** Forward-looking tools for executives — scenario simulation, target planning, and risk identification.

#### Sections

| Section | Anchor | Description |
|---|---|---|
| Scenario Simulator | `anc-ex-sim` | Interactive sliders: new members/month, churn rate, price → P&L projection, ETA to breakeven |
| Reverse Funnel | — | Target Calculator: set revenue target → system computes required leads/month |
| Risk Alert | — | Renewal Cliff chart — members expiring by month, highlights dangerous clusters |
| P&L Snapshot | `pl-section` | Revenue vs cost monthly chart, category-level cost breakdown |
| Vintage Distribution | `anc-ex-vintage` | All members bucketed by contract duration remaining |

---

### Tab ⑥ Member Directory

**Purpose:** Full member database — searchable, filterable, sortable reference table with health scores and P&L snapshot.

#### Sections

| Section | Anchor | Description |
|---|---|---|
| Member KPIs | `anc-mem-kpi` | Quick stats: total, active, by type breakdown |
| P&L Snapshot | `pl-section` | Revenue vs cost chart (same as Executive View) |
| Member Table | `anc-mem-dir` | Full member list — all ~300 members — filterable by type, vintage, status |
| Health Score | `anc-mem-health` | Member Health Score 0–100: engagement score + renewal risk composite |

#### Member Table Filters

- **Type**: All / Renew / Fellow / Distinguish / Barter / Invitation / Expired
- **Vintage**: All / <30d / 30–90d / 90–180d / 180–365d / 365+d / Expired
- **Status**: All / Active / Expiring / Risk / Expired
- Sort: all columns (name, type, end date, days left, price)

---

## 4. Cross-Tab Features

### 4.1 Sticky Tab Bar

- Always-visible at top (52px height)
- HOW Bangkok branding (wordmark + tagline) on left
- 6 tab buttons — active tab highlighted with gold underline
- Current date displayed on right

### 4.2 Sticky Section Navigation (snav)

Every tab has a sticky `.snav` bar at `top: 52px` (directly below tab bar). Contains pill-shaped jump buttons for each section within that tab. Scroll behavior: `scrollToAnchor(id)` with 98px offset (52px tab + 46px snav).

### 4.3 MTD Toggle System (All 3 Main Tabs)

Consistent UI pattern across Tabs ①②③:

```
[MTD badge] [⟳ 30 วัน (rolling)] [📅 รายเดือน] [month picker — hidden until "รายเดือน" selected]
```

- Mode state persisted in JS variables: `memberMtdMode`, `salesMtdMode`, `renewMtdMode`
- Month state: `memberMtdMonth`, `salesMtdMonth`, `renewMtdMonth` (all default: `2026-05`)
- Month picker shows immediately when "รายเดือน" is clicked

### 4.4 Table Sorting

All data tables support column-level sort toggle (asc/desc). Implemented via sort state objects per table.

### 4.5 Visual Design System

| Token | Value | Usage |
|---|---|---|
| `--gold` | `#B8892A` | Primary accent, active states, paid tier |
| `--alert` | `#C94B2A` | Danger, expiring, churn |
| `--success` | `#1C7048` | Paid, renewed, positive |
| `--blue` | `#2254A0` | Info, lead pipeline |
| `--surface` | `#FFFFFF` | Card backgrounds |
| `--bg` | `#F7F6F3` | Page background |
| Font | Inter (Google Fonts) | All text |

---

## 5. Data Model (Static)

All data currently lives as JavaScript constants in `index.html`. Below is the structure of each array.

### 5.1 `MEMBERS` Array

```js
{
  nickname: string,       // e.g., "เบนซ์"
  fullname: string,       // Full Thai name
  type: string,           // "Renew" | "Fellow" | "Distinguish" | "Barter" | "Invitation" | "Expired"
  price: number,          // Annual fee in THB (0 if unknown)
  daysLeft: number,       // Days until contract end (negative = expired)
  endDate: string,        // "YYYY-MM-DD"
  status: string,         // "active" | "expiring" | "risk" | "expired"
  inferred: boolean       // true if end date was computed, not read directly
}
```

**Paid types:** `PAID_TYPES = new Set(['Renew','Fellow','Distinguish'])`  
**Active paid count:** ~207 members (`daysLeft > 0` + paid type)

### 5.2 `LEADS` Array

```js
{
  name: string,           // Lead full name
  nickname: string,       // Nickname
  source: string,         // "P'Tak" | "Website" | "Refer" | "P'Ying" | "–"
  stageIdx: number,       // 0–5 for active stages
  outcome: string,        // "paid" | "no" | null
  label: string,          // "Hot" | "Warm" | "Cold" | null
  firstDate: string,      // "YYYY-MM-DD" — date lead entered
  lastDate: string,       // "YYYY-MM-DD" — date of last activity
  notes: string           // Free-form notes
}
```

**Reject logic:** `outcome === 'no'` → counted as Reject regardless of stageIdx

### 5.3 `PRICE_TIERS_2026` Array

```js
{
  label: string,          // "Renewal Standard" | "New Standard" | etc.
  price: string,          // Display label e.g. "฿350k/ปี"
  priceVal: number,       // Numeric value e.g. 350000
  count: number,          // Member count from 2026(mimp) Excel sheet
  revenue: number,        // Total revenue = count × price (or actual for varies)
  color: string           // Hex color for chart
}
```

Source: `Copy of HOW Member Status.xlsx` → `2026(mimp)` sheet (60 payment records)

| Tier | Count | Revenue |
|---|---|---|
| ฿350k — Renewal Standard | 34 | ฿11.90M |
| ฿420k — New Standard | 10 | ฿4.20M |
| ฿380k — New Discounted | 7 | ฿2.66M |
| ฿650k — Family Pack | 2 | ฿1.30M |
| ฿720k — 3-Year Premium | 1 | ฿0.72M |
| varies — Special Rate | 5 | ฿1.81M |
| **ไม่ระบุ/เก่า** | ~148 | — |

### 5.4 `EXPIRED_MEMBERS` Array

```js
{ nick, fullname, type, endDate: "YYYY-MM-DD", price }
```

90 records. Used for: YTD churn calculation, MTD expired count (rolling and by-month).

### 5.5 `RENEW_BY_MONTH` Object

```js
{
  '2025-10': 1, '2025-11': 0, '2025-12': 9,
  '2026-01': 9, '2026-02': 9, '2026-03': 16,
  '2026-04': 11, '2026-05': 0
}
```

Used for Renewed MTD (month mode) and Renewal Trend chart.

### 5.6 `RENEWALS` Array

Members actively being managed for renewal. Fields include: nickname, fullname, type, endDate, daysLeft, outcome, directorPic, status, notes.

---

## 6. Phase 2 — Authentication

> **Goal:** Restrict access to `@howbangkok.com` Google Workspace accounts only.

### 6.1 Problem

The dashboard URL (`howbkkdb.web.app`) is currently public — anyone with the link can see all member and lead data. This is a **data privacy risk** that must be resolved before broader sharing.

### 6.2 User Stories

- As a HOW Bangkok staff member, I log in with my `@howbangkok.com` Google account and see the full dashboard.
- As an unauthenticated visitor, I see only a login screen — no data is visible.
- As a staff member on another Google account, I see an "Access denied" error.
- As a logged-in user, I can sign out at any time.
- On page reload, I remain logged in without re-authenticating.

### 6.3 Implementation

**Firebase Authentication** with Google OAuth provider:

```javascript
firebase.auth().onAuthStateChanged(user => {
  if (user && user.email.endsWith('@howbangkok.com')) {
    showDashboard();
  } else {
    if (user) firebase.auth().signOut(); // wrong domain
    showLoginScreen();
  }
});
```

**Login screen:** HOW Bangkok branding + "Sign in with Google" button.  
**Sign-out button:** visible in header when authenticated.  
**Session persistence:** Firebase SDK default (survives page reload).

### 6.4 Acceptance Criteria

| # | Criteria |
|---|---|
| AC-01 | Unauthenticated URL visit shows login screen only — no data |
| AC-02 | `@howbangkok.com` login succeeds, shows full dashboard |
| AC-03 | `@gmail.com` or other domain shows error, returns to login |
| AC-04 | Page reload preserves authenticated session |
| AC-05 | Sign Out clears session, shows login screen |
| AC-06 | Works on iOS Safari + Android Chrome |

---

## 7. Phase 3 — Live Database Integration

> **Goal:** Replace all hardcoded JavaScript arrays with live queries to Supabase (PostgreSQL), enabling multi-user data entry without code deployment.

### 7.1 Problem

Any data change (new lead, member status update, renewal outcome) currently requires:
1. Editing the HTML source file
2. Running `firebase deploy`
3. All team members refreshing the page

This is not viable for a team making multiple updates per day.

### 7.2 Core Migrations

| Static Array | Supabase Table | Notes |
|---|---|---|
| `MEMBERS` | `members` + `contracts` | ~300 member records |
| `LEADS` | `leads` + `lead_activities` | 14 records + activity log |
| `EXPIRED_MEMBERS` | Computed from `contracts` | Filter `end_date < today` |
| `RENEWALS` | `renewals` + `renewal_activities` | Pipeline stage tracking |
| `RENEW_BY_MONTH` | Aggregate query on `contracts`/`payments` | Replace static lookup |
| `PRICE_TIERS_2026` | `payments` table with price grouping | Dynamic tier computation |

### 7.3 Dashboard Changes Required

- Replace all static arrays with `async` Supabase queries
- Add Supabase JS client via CDN
- Add loading skeletons for all sections
- Add real-time subscriptions for `members` and `leads` tables
- Migrate Auth to Supabase Auth (Google provider) — avoids dual-auth with Firebase
- Implement optimistic updates for lead stage drag/drop

### 7.4 Authentication Recommendation

Migrate from Firebase Auth to **Supabase Auth with Google provider**. Benefits:
- Single auth system (no bridging between Firebase + Supabase)
- Row Level Security (RLS) policies use `auth.jwt()` email domain claim
- Native `@howbangkok.com` domain restriction in RLS

### 7.5 Acceptance Criteria

| # | Criteria |
|---|---|
| AC-07 | Member table loads from Supabase in <2 seconds |
| AC-08 | New member added in Supabase reflects in dashboard without reload |
| AC-09 | Lead stage change updates Supabase immediately |
| AC-10 | Unauthenticated users cannot query any Supabase table (RLS blocks) |
| AC-11 | MTD stats compute dynamically from live payment records |

---

## 8. Phase 4 — Full CRM Features

> **Goal:** Expand into a lightweight CRM covering task management, payment tracking, event management, and member segmentation.

### 8.1 Task Management

- "My Tasks" sidebar: tasks assigned to logged-in user, sorted by due date
- Create tasks inline from lead/member/renewal records
- Task types: call, email, LINE, meeting, other
- Overdue = red; today = amber; future = normal
- Polymorphic: task links to lead, member, or renewal case

### 8.2 Payment Tracking

- Finance tab: outstanding invoices per member — amount, due date, days overdue
- Payment status: `pending` / `paid` / `overdue` / `waived`
- P&L forecast updates dynamically from payment records
- Alert: members with unpaid invoices >30 days

### 8.3 Enhanced Lead CRM

- Lead detail drawer: full activity log, contact history
- Stage drag-and-drop or click-to-advance
- Add activities inline (call log, LINE note, meeting note)
- Lead-to-member conversion tracking

### 8.4 Event Management

- Events tab: upcoming + past community events
- Capacity management + RSVP tracking
- Check-in linked to visits/utilization

### 8.5 Member Segmentation (Tags)

- Polymorphic tags on members and leads
- Member table tag filter
- Bulk tag assignment
- Tag management UI

### 8.6 Resource Utilization

- Desk and meeting room occupancy rate by day/week/month
- Peak hours analysis
- Seat utilization vs. contracted seats

---

## 9. Database Schema (v2)

PostgreSQL via Supabase, 16 tables, UUID primary keys, `timestamptz` timestamps.

### 9.1 Schema Overview

| Group | Tables |
|---|---|
| Members & Contracts | `members`, `contracts`, `member_contacts`, `visits` |
| Financials | `payments` |
| Sales / CRM | `leads`, `lead_activities` |
| Renewals | `renewals`, `renewal_activities` |
| Operations | `tasks`, `resources`, `events`, `event_attendees` |
| System | `users`, `config`, `tags`, `taggables` |

### 9.2 Key Tables

#### `members`
`id` · `name` · `type (individual|corporate)` · `email` · `phone` · `line_id` · `referred_by→members` · `created_at`

#### `contracts`
`id` · `member_id→members` · `seats` · `start_date` · `end_date` · `annual_fee (THB)` · `status (active|expired|cancelled)` · `price_tier`

#### `payments`
`id` · `contract_id` · `member_id` · `amount` · `due_date` · `paid_at` · `status (pending|paid|overdue|waived)` · `method` · `invoice_number`

#### `leads`
`id` · `name` · `email` · `phone` · `source (p_tak|website|refer|p_ying|other)` · `stage (0–5)` · `outcome (paid|no|null)` · `pic_id→users` · `label` · `first_date` · `last_date` · `notes`

#### `renewals`
`id` · `contract_id` · `member_id` · `pic_id→users` · `stage` · `outcome (renewed|not_renewed|upgraded|downgraded)` · `new_contract_id`

#### `tasks`
`id` · `title` · `type (call|email|line|meeting|other)` · `assigned_to→users` · `due_at` · `status (open|done|cancelled)` · `related_type (lead|member|renewal)` · `related_id` · `notes`

#### `users`
`id` · `name` · `email (@howbangkok.com)` · `role (admin|manager|staff|viewer)` · `is_active`

Full schema detail available in `/database/schema_v2.sql`.

---

## 10. Milestones & Timeline

| Phase | Milestone | Effort | Dependency |
|---|---|---|---|
| **Phase 2** | Firebase Auth + domain restriction live | 1–2 days | Firebase project access |
| **Phase 2** | Test + deploy to production | 0.5 days | Dev complete |
| **Phase 3** | Supabase project + 16-table schema | 1–2 days | Phase 2 auth |
| **Phase 3** | Data import — members + leads | 1 day | Schema live |
| **Phase 3** | Dashboard async refactor | 3–5 days | Data import |
| **Phase 3** | RLS + Supabase Auth migration | 1 day | Refactor complete |
| **Phase 4** | Tasks + payment tracking | 3–5 days | Phase 3 complete |
| **Phase 4** | Events + tags + resource utilization | 3–5 days | Phase 3 complete |

> **Priority:** Phase 2 (Authentication) should be done **before sharing the URL** with any additional team members or external parties.

---

## 11. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | Auth: Keep Firebase Auth or migrate entirely to Supabase Auth in Phase 3? | Tech Lead | Open |
| Q2 | Supabase region: Singapore (ap-southeast-1)? | Ops | Open |
| Q3 | Should `PRICE_TIERS_2026` be updated monthly, or computed dynamically once Phase 3 is live? | Finance | Open |
| Q4 | `RENEW_BY_MONTH` data — does พ.ย.68 = 0 reflect actual data or missing entry? | Ops | Open |
| Q5 | Who is responsible for keeping LEADS data up to date in the current static version? | Sales | Open |
| Q6 | Is Role-Based Access Control needed (e.g., Sales can't see P&L)? | Ops Manager | Open |
| Q7 | Should the Member Health Score algorithm be made configurable (weights)? | Ops | Open |
| Q8 | Will HOT members in `Expiring Member.xlsx` → `HOT` sheet eventually replace the `RENEWALS` array? | Ops | Open |
| Q9 | Mobile app needed in Phase 4, or is mobile-responsive web sufficient? | All | Open |

---

## 12. Appendix

### 12.1 Lead Stage Definitions

| Index | Stage | Description |
|---|---|---|
| 0 | 1st Contact | First outreach made |
| 1 | 2nd Contact | Follow-up contact |
| 2 | Director Contact | Senior director engaged |
| 3 | Considering | Lead evaluating options |
| 4 | Billing | Invoice being prepared |
| 5 | Paid | Converted to member |
| R | Reject | `outcome === 'no'` — lead declined |

### 12.2 Member Type Definitions

| Type | Definition |
|---|---|
| **Renew** | Returning member — previously was Fellow; renewed contract |
| **Fellow** | Standard annual paid member |
| **Distinguish** | Premium or long-standing paid member tier |
| **Barter** | Non-cash arrangement — services exchanged for membership |
| **Invitation** | Complimentary or invited member |
| **Expired** | Contract fully expired, no active renewal |

### 12.3 Vintage Bucket Definitions

| Bucket | Days Remaining | Urgency |
|---|---|---|
| 🔴 Critical | ≤ 30 days | Contact immediately |
| 🟡 Hot | 31–90 days | Start renewal process |
| 🟠 Warm | 91–180 days | Monitor + schedule |
| 🔵 Cold | 181–365 days | Relationship maintenance |
| ✅ Stable | 365+ days | Long-term — no action needed |

### 12.4 File Reference

| File | Location | Description |
|---|---|---|
| `index.html` | `HOW System/Dashboard on Firebase/` | Dashboard — single source of truth |
| `firebase.json` | Same folder | Firebase Hosting config (SPA rewrite) |
| `.firebaserc` | Same folder | Firebase project binding (`howbkkdb`) |
| `Copy of HOW Member Status.xlsx` | Same folder | Member + payment data source |
| `Copy of Leads_HOW_2026.xlsx` | Same folder | Lead pipeline data source |
| `Expiring Member.xlsx` | Same folder | Renewal pipeline data source |
| `HOW_Dashboard_PRD.md` | Same folder | This document |
| `HOW_Dashboard_คู่มือ.md` | Same folder | User guide (Thai) |

### 12.5 Deployment Reference

```bash
# Deploy to Firebase Hosting
cd "HOW System/Dashboard on Firebase"
firebase deploy --only hosting
# → https://howbkkdb.web.app
```

Account: `benz@howbangkok.com`  
Project: `howbkkdb`

---

*Confidential — Internal Use Only · HOW Bangkok Operations · Updated 17 May 2026*
