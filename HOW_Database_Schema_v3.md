# HOW Bangkok — Database Schema v3
## Supabase / PostgreSQL

| | |
|---|---|
| **Version** | 3.0 |
| **Date** | 17 May 2026 |
| **Engine** | PostgreSQL 15 via Supabase |
| **Design Principles** | Normalized · Enum-safe · Audit-ready · Class-ready |

---

## Entity Map (ภาพรวม)

```
MEMBERS ──────────────────────────────────────────────────┐
  │                                                         │
  ├── CONTRACTS (membership periods)                        │
  │     └── PAYMENTS (per contract)                         │
  │     └── PAUSES (pause periods)                          │
  │                                                         │
  ├── LEADS (ก่อนเป็นสมาชิก) ──── converted_to ────────────┘
  │     └── LEAD_ACTIVITIES
  │
  ├── RENEWALS (renewal cases)
  │     └── RENEWAL_ACTIVITIES
  │
  ├── CLASS_ATTENDANCE ──── CLASSES
  │     └── CLASS_FEEDBACK
  │
  ├── TASKS (follow-up actions)
  ├── FULFILLMENTS (EMS/WHT/Wine/App checklist)
  └── TAGGABLES ──── TAGS

STAFF (users / directors) — referenced across all entities
CONFIG (app settings)
COURSE_CREDITS (pricing rules)
```

---

## Table Definitions

---

### 1. `staff` — ทีมงาน HOW Bangkok

```sql
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,              -- "Yui", "Ying", "Tak", "Jo", "Mambo", "Benz"
  full_name   TEXT,
  email       TEXT UNIQUE,               -- @howbangkok.com
  role        TEXT NOT NULL DEFAULT 'staff',
                                          -- 'admin' | 'manager' | 'staff' | 'viewer'
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

> Source: POC / Director / Who / ใครตาม columns across all sheets  
> Values observed: Yui, Ying, Tak, Jo, Krating, Mambo, Tata, Benz

---

### 2. `members` — ข้อมูลสมาชิก (identity layer)

```sql
CREATE TABLE members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  full_name       TEXT,                   -- ชื่อจริง นามสกุล (Thai)
  app_name        TEXT,                   -- English name used in HOW app
  nickname        TEXT NOT NULL,          -- ชื่อเล่น — primary display name
  email           TEXT UNIQUE,            -- App Email
  phone           TEXT,                   -- store as TEXT (avoid int overflow)
  line_id         TEXT,
  company         TEXT,                   -- Company / Inv Name (corporate)

  -- Referral
  referred_by_id  UUID REFERENCES members(id),

  -- App flags
  app_status      TEXT DEFAULT 'done',    -- 'done' | 'no_app' | 'edit'
  once_how        BOOLEAN DEFAULT false,  -- เคยเป็น HOW member ก่อนหน้ามาก่อนไหม
  unofficial_2    BOOLEAN DEFAULT false,  -- Unofficial 2.0 flag

  -- Meta
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

> Source: `new by tata` sheet (col 1–4, 15, 18–21)  
> NOTE: ไม่เก็บ Days Remaining, Member Since, Member Till — คำนวณจาก contracts แทน

---

### 3. `contracts` — สัญญาสมาชิก

```sql
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id),

  -- Membership type
  pack_type       TEXT NOT NULL,
    -- 'fellow_1y' | 'fellow_2y' | 'fellow_3y'
    -- 'family_1y' | 'family_2y'
    -- 'corporate' | 'barter' | 'invitation' | 'distinguish'
  member_type     TEXT NOT NULL,
    -- 'fellow' | 'distinguish' | 'barter' | 'invitation' | 'team'
  is_renewal      BOOLEAN DEFAULT false,  -- new member vs renewal

  -- Dates
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  bonus_months    INT DEFAULT 0,          -- Month Plus (bonus months awarded)
  total_months    INT,                    -- ได้รวมกี่เดือน

  -- Pricing
  annual_fee      NUMERIC(12,2),          -- Renew Price (THB)

  -- Invoice
  inv_name        TEXT,                   -- ชื่อใบแจ้งหนี้

  -- Status
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'expired' | 'cancelled' | 'paused' | 'transferred'

  -- Meta
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Computed helper (use in queries / views)
-- GENERATED ALWAYS AS (end_date - CURRENT_DATE) STORED  → days_remaining
```

> Source: `new by tata` (col 5–12, 17), `Renew` sheet, `New member` sheet, `3 Year Members` sheet  
> One member can have multiple contracts (renewal = new row)

---

### 4. `contract_pauses` — ช่วงเวลา Pause สมาชิก

```sql
CREATE TABLE contract_pauses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES contracts(id),
  member_id       UUID NOT NULL REFERENCES members(id),
  pause_start     DATE NOT NULL,
  pause_end       DATE,                   -- null = still paused
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

> Source: `Pause` column in `new by tata` — currently broken (#REF! errors), needs clean data  
> Separate table allows multiple pauses per contract + duration tracking

---

### 5. `payments` — การชำระเงิน

```sql
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES contracts(id),
  member_id       UUID NOT NULL REFERENCES members(id),  -- denorm for fast query

  -- Amounts
  price           NUMERIC(12,2) NOT NULL,   -- ราคาตามใบเสนอ
  amount_gross    NUMERIC(12,2),            -- รวม VAT/WHT
  amount_net      NUMERIC(12,2),            -- NET received
  fee             NUMERIC(12,2),            -- ค่าธรรมเนียม (2C2P/EDC)
  wht_amount      NUMERIC(12,2),            -- ภาษีหัก ณ ที่จ่าย

  -- Payment info
  paid_at         DATE,
  method          TEXT,
    -- 'transfer' | '2c2p' | 'edc' | 'cheque'
  status          TEXT DEFAULT 'paid',
    -- 'pending' | 'paid' | 'partial' | 'overdue' | 'waived'
  period_month    TEXT,                     -- 'YYYY-MM' (Oct = '2025-10')
  inv_name        TEXT,                     -- Invoice recipient name

  -- Flags
  wht_done        BOOLEAN DEFAULT false,    -- WHT filed
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

> Source: `2026(mimp)` sheet (all columns), `Renew` sheet (partial)  
> NOTE: รองรับ split payment (เช่น หม่ำ แบ่งจ่าย 2 รอบ = 2 rows ใน contract เดียว)

---

### 6. `leads` — ผู้สนใจ / New Sales Pipeline

```sql
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            TEXT,                   -- ชื่อจริง
  nickname        TEXT,
  position        TEXT,                   -- ตำแหน่งงาน
  company         TEXT,
  email           TEXT,
  phone           TEXT,                   -- store as TEXT
  line_id         TEXT,

  -- Lead source
  source          TEXT,
    -- 'website' | 'refer' | 'p_tak' | 'p_jo' | 'p_ying' | 'p_mambo' | 'other'
  referrer        TEXT,                   -- ชื่อคนแนะนำมา (free text หรือ member_id)
  referrer_member_id UUID REFERENCES members(id),
  how_knew        TEXT,                   -- How did you know about HOW (form answer)

  -- Pipeline
  stage_idx       INT NOT NULL DEFAULT 0, -- 0=1st Contact, 1=2nd, 2=Director, 3=Considering, 4=Billing, 5=Paid
  outcome         TEXT,                   -- 'paid' | 'no' | null
  label           TEXT,                   -- 'Hot' | 'Warm' | 'Cold'
  visited         BOOLEAN DEFAULT false,  -- เคยมาดูสถานที่แล้วไหม

  -- Assignment
  poc_id          UUID REFERENCES staff(id),

  -- Dates
  form_submitted_at TIMESTAMPTZ,          -- Typeform submission timestamp
  first_contact_at  DATE,                 -- วันที่เริ่มติดต่อ
  last_contact_at   DATE,                 -- วันที่ติดต่อล่าสุด

  -- Conversion
  converted_member_id UUID REFERENCES members(id),  -- ถ้า paid → link

  -- Meta
  notes           TEXT,
  form_submission_id TEXT,                -- Typeform submission ID
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

> Source: `HOW Interest Form (1)` sheet (Leads file) + LEADS array in dashboard

---

### 7. `lead_activities` — ประวัติการติดตาม Lead

```sql
CREATE TABLE lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  type        TEXT NOT NULL,
    -- 'call' | 'line' | 'email' | 'meeting' | 'visit' | 'note' | 'stage_change'
  from_stage  INT,                        -- stage ก่อนหน้า (ถ้าเป็น stage_change)
  to_stage    INT,                        -- stage ใหม่
  notes       TEXT,
  created_by  UUID REFERENCES staff(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

### 8. `renewals` — เคส Renewal Management

```sql
CREATE TABLE renewals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id),
  contract_id     UUID NOT NULL REFERENCES contracts(id),  -- สัญญาที่กำลังจะหมด

  -- Assignment
  director_poc_id UUID REFERENCES staff(id),     -- Director POC (Tak/Yui/Ying)
  mambo_pic_id    UUID REFERENCES staff(id),     -- Mambo / operational PIC

  -- Status
  status          TEXT NOT NULL DEFAULT 'considering',
    -- 'renewed' | 'billing' | 'considering' | 'not_renewing' | 'transferred' | 'pending'
  likelihood      INT CHECK (likelihood BETWEEN 0 AND 10),  -- Engagement Score 0–10
  likelihood_verbal TEXT,
    -- 'yes' | 'maybe' | 'maybe_not' | 'no'

  -- Engagement segment (2x2 matrix from 1Y Membership sheet)
  engagement_segment TEXT,
    -- 'model_citizens' (H,H) | 'quiet_luxury' (H,L)
    -- 'upcoming_star' (L,H) | 'hidden_gem' (L,L)

  -- Expiry context
  expiry_month    TEXT,                   -- 'YYYY-MM' เดือนที่หมดอายุ

  -- Process tracking
  approach        TEXT,                   -- 'line' | 'read' | 'call'
  process_stage   TEXT,                   -- free text process note
  is_paused       BOOLEAN DEFAULT false,

  -- Outcome
  outcome         TEXT,
    -- 'renewed' | 'not_renewed' | 'transferred'
  new_contract_id UUID REFERENCES contracts(id),  -- สัญญาใหม่ถ้าต่อแล้ว

  -- Notes
  mambo_action    TEXT,                   -- Mambo Action column
  director_action TEXT,                   -- Director Action column
  remark          TEXT,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

> Source: `Q1-2026` sheet + `December` sheet (Expiring Member.xlsx)

---

### 9. `renewal_activities` — ประวัติการติดตาม Renewal

```sql
CREATE TABLE renewal_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id  UUID NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,

  type        TEXT NOT NULL,
    -- 'call' | 'line' | 'email' | 'meeting' | 'proposal' | 'note' | 'status_change'
  from_status TEXT,
  to_status   TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES staff(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

### 10. `fulfillments` — Checklist งาน (EMS / WHT / Wine / App)

```sql
CREATE TABLE fulfillments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES contracts(id),
  member_id     UUID NOT NULL REFERENCES members(id),

  -- ประเภท fulfillment
  type          TEXT NOT NULL,
    -- 'ems' | 'wht' | 'wine' | 'app_setup' | 'app_renew'
    -- 'invoice_sent' | 'thank_you' | 'onboarding' | 'gift_delivery'

  status        TEXT DEFAULT 'pending',   -- 'pending' | 'done' | 'skipped'
  done_at       TIMESTAMPTZ,
  done_by       UUID REFERENCES staff(id),
  delivery_method TEXT,                   -- 'ems' | 'postal' | 'in_person' | 'email'
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

> Source: EMS/WHT/Wine/App/Prepare columns in `Renew`, `New member`, `3 Year Members`, `WINE` sheets  
> แทนที่จะเก็บเป็น boolean columns แยกๆ → flexible รองรับ type ใหม่ในอนาคตได้เลย

---

### 11. `classes` — Class / Session Catalog

```sql
CREATE TABLE classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
    -- 'workshop' | 'networking' | 'wellness' | 'talk' | 'masterclass' | 'other'
  tags            TEXT[],                 -- ['marketing','leadership','beginner']

  -- Instructor / host
  instructor_name TEXT,
  instructor_bio  TEXT,
  hosted_by_id    UUID REFERENCES staff(id),  -- ถ้า staff จัดเอง

  -- Schedule
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT,
  capacity        INT,
  venue           TEXT,

  -- Status
  status          TEXT DEFAULT 'scheduled',
    -- 'scheduled' | 'completed' | 'cancelled'

  -- External source (พอ import จาก app)
  external_id     TEXT UNIQUE,            -- ID จาก app เดิม

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

---

### 12. `class_attendance` — ใครมาเข้าร่วม

```sql
CREATE TABLE class_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id),

  status          TEXT DEFAULT 'attended',
    -- 'attended' | 'no_show' | 'waitlist' | 'cancelled'
  checked_in_at   TIMESTAMPTZ,
  source          TEXT DEFAULT 'manual',
    -- 'app' | 'form' | 'manual' | 'import'

  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (class_id, member_id)            -- ไม่ให้ duplicate
);
```

---

### 13. `class_feedback` — Rating หลัง class

```sql
CREATE TABLE class_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id   UUID NOT NULL REFERENCES class_attendance(id),
  member_id       UUID NOT NULL REFERENCES members(id),
  class_id        UUID NOT NULL REFERENCES classes(id),

  rating          INT CHECK (rating BETWEEN 1 AND 5),
  would_return    BOOLEAN,
  topics_interest TEXT[],                 -- ['AI','finance','leadership'] — ความสนใจที่แจ้ง
  comment         TEXT,

  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (attendance_id)                  -- 1 feedback per attendance
);
```

---

### 14. `tasks` — Action items / Follow-up

```sql
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title           TEXT NOT NULL,
  type            TEXT,
    -- 'call' | 'line' | 'email' | 'meeting' | 'other'
  assigned_to     UUID REFERENCES staff(id),
  due_at          TIMESTAMPTZ,
  status          TEXT DEFAULT 'open',
    -- 'open' | 'in_progress' | 'done' | 'cancelled'

  -- Polymorphic link (linked to any entity)
  related_type    TEXT,
    -- 'lead' | 'member' | 'renewal' | 'class'
  related_id      UUID,

  notes           TEXT,
  created_by      UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  done_at         TIMESTAMPTZ
);
```

---

### 15. `tags` + `taggables` — Flexible labeling

```sql
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,       -- 'VIP' | 'Enterprise' | 'Wellness Fan'
  color       TEXT,
  category    TEXT
    -- 'member_segment' | 'lead_label' | 'class_topic' | 'interest'
);

CREATE TABLE taggables (
  tag_id          UUID NOT NULL REFERENCES tags(id),
  taggable_type   TEXT NOT NULL,          -- 'member' | 'lead' | 'class'
  taggable_id     UUID NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tag_id, taggable_type, taggable_id)
);
```

---

### 16. `course_credits` — เกณฑ์ credit ตามประเภทสมาชิก

```sql
CREATE TABLE course_credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_type       TEXT NOT NULL,          -- 'single' | 'family' | 'corporate'
  member_status   TEXT NOT NULL,          -- 'new' | 'renew' | 'existing'
  sub_type        TEXT,                   -- '[NEW]Member', '[RN]Year1', etc.
  price_label     TEXT,                   -- '350k', '380k', '420k'
  price_value     NUMERIC(12,2),
  credit_on_join  NUMERIC(10,2),          -- เครดิตที่ได้เมื่อเข้าใหม่
  credit_on_renew NUMERIC(10,2),          -- เครดิตที่ได้เมื่อต่ออายุ
  notes           TEXT,
  valid_from      DATE,
  valid_until     DATE
);
```

> Source: `Course Credit` sheet — pricing rules table

---

### 17. `config` — App configuration

```sql
CREATE TABLE config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES staff(id),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Example rows:
-- ('renewal_warning_days',   '90',                    'Days before expiry to flag for renewal')
-- ('mtd_rolling_days',       '30',                    'Rolling window for MTD calculations')
-- ('renew_rate_target',      '0.9',                   'Target renewal rate 90%')
-- ('price_tiers_2026',       '[{"label":"350k",...}]', 'YTD 2026 price tier definitions')
-- ('engagement_score_weights','{"attend":3,"feedback":2,"renew":5}', 'Health score formula')
```

---

## Indexes (สำคัญสำหรับ performance)

```sql
-- contracts
CREATE INDEX idx_contracts_member     ON contracts(member_id);
CREATE INDEX idx_contracts_status     ON contracts(status);
CREATE INDEX idx_contracts_end_date   ON contracts(end_date);

-- payments
CREATE INDEX idx_payments_contract    ON payments(contract_id);
CREATE INDEX idx_payments_member      ON payments(member_id);
CREATE INDEX idx_payments_paid_at     ON payments(paid_at);
CREATE INDEX idx_payments_period      ON payments(period_month);

-- leads
CREATE INDEX idx_leads_stage          ON leads(stage_idx);
CREATE INDEX idx_leads_outcome        ON leads(outcome);
CREATE INDEX idx_leads_source         ON leads(source);

-- renewals
CREATE INDEX idx_renewals_member      ON renewals(member_id);
CREATE INDEX idx_renewals_status      ON renewals(status);
CREATE INDEX idx_renewals_month       ON renewals(expiry_month);
CREATE INDEX idx_renewals_poc         ON renewals(director_poc_id);

-- class_attendance
CREATE INDEX idx_attendance_class     ON class_attendance(class_id);
CREATE INDEX idx_attendance_member    ON class_attendance(member_id);

-- tasks
CREATE INDEX idx_tasks_assigned       ON tasks(assigned_to);
CREATE INDEX idx_tasks_status         ON tasks(status);
CREATE INDEX idx_tasks_related        ON tasks(related_type, related_id);

-- taggables
CREATE INDEX idx_taggables_entity     ON taggables(taggable_type, taggable_id);
```

---

## Views ที่ควร Create (Dashboard พึ่งพามาก)

```sql
-- ① Active members with days remaining
CREATE VIEW v_active_members AS
SELECT
  m.id, m.nickname, m.full_name, m.email,
  c.id AS contract_id,
  c.pack_type, c.member_type, c.annual_fee,
  c.start_date, c.end_date,
  (c.end_date - CURRENT_DATE) AS days_remaining,
  c.status
FROM members m
JOIN contracts c ON c.member_id = m.id
WHERE c.status = 'active'
  AND c.end_date >= CURRENT_DATE;

-- ② Expiring within 90 days
CREATE VIEW v_expiring_members AS
SELECT * FROM v_active_members
WHERE days_remaining <= 90
ORDER BY days_remaining;

-- ③ Monthly payment summary (replaces RENEW_BY_MONTH)
CREATE VIEW v_renew_by_month AS
SELECT
  period_month,
  COUNT(*) AS renewed_count,
  SUM(amount_net) AS revenue
FROM payments
WHERE status = 'paid'
GROUP BY period_month
ORDER BY period_month;

-- ④ Class performance
CREATE VIEW v_class_performance AS
SELECT
  cl.id, cl.title, cl.category, cl.scheduled_at,
  cl.capacity,
  COUNT(ca.id) FILTER (WHERE ca.status = 'attended') AS attended,
  ROUND(COUNT(ca.id) FILTER (WHERE ca.status = 'attended')::numeric
        / NULLIF(cl.capacity, 0) * 100, 1) AS fill_rate_pct,
  ROUND(AVG(cf.rating), 2) AS avg_rating,
  COUNT(cf.id) AS feedback_count
FROM classes cl
LEFT JOIN class_attendance ca ON ca.class_id = cl.id
LEFT JOIN class_feedback cf ON cf.class_id = cl.id
GROUP BY cl.id;

-- ⑤ Member class affinity (category preference per member)
CREATE VIEW v_member_affinity AS
SELECT
  ca.member_id,
  cl.category,
  COUNT(*) AS attended_count,
  ROUND(AVG(cf.rating), 2) AS avg_rating
FROM class_attendance ca
JOIN classes cl ON cl.id = ca.class_id
LEFT JOIN class_feedback cf
  ON cf.attendance_id = ca.id
WHERE ca.status = 'attended'
GROUP BY ca.member_id, cl.category;
```

---

## Row Level Security (RLS) — Phase 3

```sql
-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
-- ... (all tables)

-- Policy: authenticated users with @howbangkok.com can read/write
CREATE POLICY "howbangkok staff only" ON members
  FOR ALL
  USING (auth.jwt() ->> 'email' LIKE '%@howbangkok.com');
```

---

## Data Import Map (Excel → Supabase)

| Excel File | Sheet | → Table | Priority |
|---|---|---|---|
| HOW Member Status | `new by tata` | `members` + `contracts` | P0 |
| HOW Member Status | `2026(mimp)` | `payments` | P0 |
| HOW Member Status | `Renew` + `New member` | `contracts` (historical) | P1 |
| HOW Member Status | `3 Year Members` | `contracts` (3Y type) | P1 |
| HOW Member Status | `1 Year Membership` | `renewals` (2025 cycle) | P1 |
| HOW Member Status | `ตาม` | `fulfillments` (invoice tracking) | P2 |
| HOW Member Status | `WINE` | `fulfillments` (wine delivery) | P2 |
| HOW Member Status | `Course Credit` | `course_credits` | P2 |
| Expiring Member | `Q1 - 2026` | `renewals` (2026 cycle) | P0 |
| Expiring Member | `December` | `renewals` (Dec 2025 cycle) | P1 |
| Expiring Member | `HOT` | `leads` (hot prospects) | P1 |
| Leads HOW 2026 | `HOW Interest Form` | `leads` | P0 |
| HOW app (export) | TBD | `classes` + `class_attendance` | P3 |

**P0** = import ก่อน dashboard จะใช้งาน live ได้  
**P1** = import ให้ historical analytics ครบ  
**P2** = nice to have, operational  
**P3** = รอ app export

---

## Schema Decisions & Rationale

| Decision | Rationale |
|---|---|
| `contract_pauses` แยกตาราง | Pause column ใน Excel เป็น #REF! — ต้องการ start/end dates จริง รองรับ multiple pauses |
| `fulfillments` แยกตาราง | EMS/WHT/Wine/App เป็น boolean columns ใน Excel → ถ้า type ใหม่มาจะ alter table; แยกเป็น rows ยืดหยุ่นกว่า |
| `payments` แยกจาก `contracts` | หม่ำแบ่งจ่าย 2 งวด = 2 rows; รองรับ partial payment, split billing ได้ |
| `staff` แยกจาก `auth.users` | Supabase Auth ใช้ UUID ของ auth system; `staff` เก็บ HOW-specific data (nickname, role) link กลับด้วย email |
| phone เป็น `TEXT` | Excel เก็บเป็น int (66954525525) ทำให้ overflow ถ้าเป็น int column |
| `days_remaining` ไม่ store | Derived จาก `end_date - CURRENT_DATE` — ถ้า store จะ stale ทันที; compute in view |
| `classes.tags` เป็น `TEXT[]` | Class topic tags เปลี่ยนบ่อย, ไม่ต้องการ many-to-many overhead — array ง่ายกว่าและ query ด้วย `@>` ได้ |
| `taggables` polymorphic | สำหรับ segment/label tags ที่ใช้ข้ามหลาย entity |
| `config` JSONB | รองรับค่า config ทุกประเภทโดยไม่ต้อง alter schema |

---

*HOW Bangkok Internal · Database Schema v3 · 17 May 2026*
