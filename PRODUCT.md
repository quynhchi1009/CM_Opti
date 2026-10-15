# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React prototype of the Admin Center credit management screens. It is a design prototype, not production code. Data is mocked.

## Users

- **Org admins (Super Admin / Billing Admin)** at enterprise Optimizely customers who have bought a shared pool of Opal credits. Their job is to split that pool across internal departments, see who is using credits, catch overruns early, and back up internal chargeback. They create departments, set budgets and receive alerts by default.
- **Department contact**: a named person per department, not necessarily an admin (for example, a marketing manager). Receives threshold alerts for their department.
- **CSM (Optimizely, internal)**: receives 75% and 100% alerts so they can raise usage before renewal.
- **End users in Opal** are out of scope for V1. They see only their own usage, never department budgets.

## Product Purpose

Opal is Optimizely's AI platform for marketers. Customers buy Opal credits upfront as one shared org pool. Today they can see consumption only at org level, so they can't attribute it, forecast it or chargeback by department. This feature adds department-level credit management to Admin Center → Usage & Billing → Credits tab.

Phase 1 (V1) covers:
- admin-defined departments, with user and Virtual Teammate assignment
- soft credit budgets
- consumption visibility at org and department level
- threshold alerts

**Visibility, not enforcement.** Usage is never blocked in V1.

Success means:
- Enterprise deals blocked on group-level credit controls (Grant Thornton, JCB) move forward and commit to a V2 beta.
- Fewer credit-related support tickets and escalations.
- Team creation completion rate ≥ 85%.
- Department creation wizard takes ≤ 90s.
- Threshold alerts lead to an action within 7 days.

## Positioning

Credit governance lives in Admin Center, the same place admins already manage seats, users, groups and entitlements, and not inside Opal. Budgets are soft. They give attribution and early warning without stopping automated workflows or slowing down adoption. Optimizely is prioritizing Opal adoption, and hard limits on the older Impressions model made customers stop work near their limit.

## Operating Context

- Lives in Optimizely Admin Center, under Settings → Usage & Billing. Credits is a tab alongside other products (CMS PaaS, Content Marketing Platform, Experimentation, …). The tab only appears for orgs that pay for Opal.
- Page structure:
  - Organization Credit Summary: consumed vs contracted, remaining, expiry date and last-updated time.
  - Credit budget by department: an expandable table showing consumers per department.
  - Virtual Teammates usage section.
- Department creation is a 3-step wizard:
  1. Department info and members: search and filter users, select and remove them.
  2. Set budget: a % share of the org total, with a slider showing what's available.
  3. Review: edit links on each section, then Create department.
  Every choice is staged until the admin confirms.
- **Manage** opens a drawer with three tabs: Credit Usage, Members and Department Details.
- Credit usage breakdown views: People, Agent, Virtual Teammates, Department, Product.
- Alerts go out by email only, sent by the Money (MON) team. Admin Center owns the recipient configuration UI.
- Credit data currently lags by about 6 hours. "Real-time" is still being negotiated.
- Orgs can hold several credit allotments with different start and end dates. Budgets set as % of the org pool change as allotments start and expire.

## Capabilities and Constraints

**Terminology (UI copy must use these consistently):**
- **Credit:** the unit of Opal consumption, drawn from the org pool. Budgets never reserve credits.
- **Organization credit pool:** the single shared pool the org bought. All real usage comes out of it.
- **Department:** an admin-defined group of users and VTs used for credit tracking and chargeback. It is not an access role and is separate from CMP Teams and Groups. The UI says "Department", not "Team".
- **Department budget:** a soft allocation. Never say "limit" in V1 UI, because nothing is enforced.
- **Available to allocate:** credits not yet budgeted to any department. A bookkeeping number, not real remaining credits.
- **Actual organization remaining:** credits left for real usage.
- **Unallocated:** a system-generated department that always exists. It holds every unassigned user and VT, plus all usage from before departments existed.
- **Virtual Teammate (VT):** an agentic user (user type AGENT), assigned to a department as an individual. Always show its Principal(s).
- **Over budget:** a display state only. Usage continues.

**Rules:**
- One user or VT belongs to one department. Choosing someone already in another department moves them. Their future usage goes to the new department; their past usage stays with the old one.
- Department names must be unique. A department can be created with no members.
- A budget is required. It defaults to a % of the org pool; the exact default (25% proposed) is not decided.
- **Increasing a budget:**
  - Not allowed above Available to allocate: saving is blocked. To fix, the admin lowers the amount, reduces another department's budget or adds credits.
  - A partial increase on an over-budget department is allowed, with a warning.
- **Decreasing a budget:** allowed even below current usage. The admin sees a warning before saving.
- **Display states, at org and department level:**
  - On track: 0–74%, green.
  - Approaching: 75–99%, amber.
  - Over budget: ≥100%. The progress bar stops at full, but the numbers are never capped (for example, 3,180 · 106% · "X overage").
- **Alerts:**
  - Thresholds at 75%, 90% and 100%.
  - The overage alert is sent when the budget is crossed, then once a month.
  - Super Admin, Billing Admin and CSM are fixed recipients and can't be removed. Admins can add more recipients; the same person can't be added twice.
- **Allocation history log (read-only):**
  - department created or deleted
  - budget changed (old → new value)
  - member or VT moved (from → to)
  - credits purchased or period reset
- Deleting a department moves its members to Unallocated.

**Out of scope for V1:**
- hard stops of any kind
- warnings to end users inside Opal
- per-user caps
- bulk setup
- configurable alert frequency
- pacing analytics
- migrating Groups or CMP Teams

**Not decided yet:**
- what happens commercially when the whole org pool runs out
- whether a deleted department's history stays read-only or its credits go back to Unallocated
- whether to deactivate a department (possibly V2)
- how automated workflows are attributed (assumed: to whoever set up the schedule)
- who gets alerts for VTs with several Principals
- whether "Stop new usage" appears in the UI at all
- whether a budget can also be set as a fixed credit amount, alongside the current % approach

## Brand Commitments

- Optimizely Admin Center product chrome. Keep what's already there:
  - Optimizely logo, org switcher and breadcrumb ("Optimizely Solution Architect / Admin Center")
  - Ask Opal entry point
  - left nav: User Management, Access Setup, Settings
- Matches the existing Admin Center UI shown in the provided screenshots. Primary actions use the lime-green button style ("Request credits", "Add department budget").
- Voice is calm and factual. Usage is explained, never alarming. Pick words that reassure ("budget", "approaching", "over budget") rather than words that imply blocking ("limit", "cap", "stopped").

## Evidence on Hand

- `~/Downloads/OPSCL-Opal Credit Management PRD_ Admin Center - v1-061026-145832.pdf`: V1 PRD (Afia Chowdhury, PM; Thuan Nguyen, designer; Sarah Mitchell, Money PM).
- `~/Downloads/MONEY-Opal Credit Allocation Rules - V1 (Soft Budget)-061026-145959.pdf`: allocation rules, terminology, display states, budget-change rules, history log, multi-allotment scenarios.
- `~/Downloads/MONEY-Problem Alignment-061026-145851.pdf`: customer and internal problem framing from internal interviews.
- Figma screenshots, shared in session but not yet saved in the repo:
  - Usage & Billing Credits page
  - wizard step 1: department and members, search and filter, add and remove members
  - wizard step 2: set budget with slider; default, empty and over-available states
  - wizard step 3: review
  - Manage drawer and deletion dialogs
  - credit usage breakdown tabs
- Sample data in the screenshots is placeholder data, for example Marketing - US: 12 members, 3,500 allocated, 2,800 consumed; org total 8,200 of 15,000. Customer names (Grant Thornton, JCB, UNICEF, Legal & General) come from discovery notes and must not show up as fake usage data or testimonials.
- There is no real customer usage data, quantitative demand data or user research yet. Don't make any up.

## Product Principles

1. **Visibility before enforcement.** Show where credits go and warn early. Never imply something is blocked when it isn't.
2. **Never disrupt work.** Nothing here may suggest stopping automated workflows or VTs. Over budget is information, not a failure state.
3. **Numbers stay honest.** Show the real consumed amount and percentage even past 100%. Keep Available to allocate clearly separate from actual remaining credits.
4. **Nothing changes until confirmed.** Wizard and edit steps are staged and reviewable, every change goes into the history log, and every consequence (member moves, a budget dropping below usage) is shown before saving.
5. **Every credit has a home.** Unallocated is always visible, nudging admins to assign people and agents, and making sure department totals add up to org consumption.

## Accessibility & Inclusion

No product-specific standard has been set yet. Status must never rely on colour alone: the green, amber and over-budget states need text badges (ON TRACK / APPROACHING / OVER BUDGET), as the spec defines.
