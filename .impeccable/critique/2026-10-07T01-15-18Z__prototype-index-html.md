---
target: the credit management module
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/chi.lai/CM/prototype/index.html"
target_fingerprint: "sha256:10b1d645b9e3ae34bda1ea2d07b573230508719792bf3676452103d08bba97d4"
target_path: /Users/chi.lai/CM/prototype/index.html
timestamp: 2026-10-07T01-15-18Z
slug: prototype-index-html
---
# Critique: Opal credit management prototype

Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 24/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | "Last updated: just now" hides ~6h lag; Manage tabs don't flag unsaved edits; new dept row not highlighted |
| 2 | Match System / Real World | 3 | Terminology disciplined; budgets % only to 1 decimal, 3,500 can't be entered |
| 3 | User Control and Freedom | 2 | Staged + Undo good; Discard/Leave dialogs focus the destructive button |
| 4 | Consistency and Standards | 2 | Manage is a modal, not the specced drawer/tabs; member counts disagree |
| 5 | Error Prevention | 2 | Over-available blocked well; checked-but-not-added people dropped; Request credits one-click |
| 6 | Recognition Rather Than Recall | 3 | Manage shows proposed budget only, no old → new |
| 7 | Flexibility and Efficiency | 2 | No sort/filter/export, no credit input, 3-step removal |
| 8 | Aesthetic and Minimalist Design | 3 | Calm; wizard step 1 crowded |
| 9 | Error Recovery | 3 | Specific errors; no link to request credits, disabled Continue unexplained |
| 10 | Help and Documentation | 2 | No help on lag, % drift, alert recipients |

## Design Specificity Verdict
Behaviour and copy authored for this product (budget slider with free/taken/available zones, berry over-budget with "usage continues", move notes, permanent Unallocated row). Visual layer is generic admin UI, appropriate for matching Admin Center.
Detector: source scan clean (exit 0). Rendered-page scan: 41 findings, mostly false positives (Inter = brand, disabled-button contrast exempt, shadow on prototype-only Screens toggle). Real: placeholder #737a76 at 4.4:1 (styles.css:349); .card.flush overflow:hidden may clip table tooltips (styles.css:179); flow board lede ~97 chars/line (flow.css:31).

## What's Working
1. Terminology and voice consistent; "limit" never appears.
2. Budget slider with over-available state.
3. Staged consequences: move notes, overage notes, Undo bar, explicit delete copy.

## Priority Issues
- [P1] Checked members silently dropped unless "Add to department" clicked (member-picker.jsx:51, wizard.jsx:49). Fix: checkbox stages directly, or prompt on Continue. /impeccable harden
- [P1] On track has no text badge (ui.jsx:40), none on org card. Fix: quiet ON TRACK badge everywhere. /impeccable audit
- [P1] Discard/Leave dialogs initial-focus the destructive ghost button (ui.jsx:187, manage.jsx:336, wizard.jsx:245). Fix: focus Keep editing/Stay. /impeccable harden
- [P2] Budget input % only (budget-slider.jsx:33). Fix: paired credits ↔ % input, credits primary. /impeccable shape
- [P2] Misleading freshness and alert recipients; department contact never collected (credits-page.jsx:54, wizard.jsx:181, app.jsx:148). Fix: "Usage as of …" copy, contact field, recipients list. /impeccable clarify

## Persona Red Flags
- Alex: two-click add, no sort, no credit input, 3-step removal, jumping modal height.
- Sam: destructive default focus, no status on green rows, Tabs lacks aria-controls/tabpanel, errors not announced, disabled Continue unexplained.
- Jordan: 61 vs 26 people, Unallocated "Assign" opens create wizard, Available to allocate vs remaining only separated by tooltip.
- Priya (Billing Admin chargeback): no monthly period, no export, org-level/deleted history hidden (manage.jsx:54), "available to allocate" in Consumed column (credits-page.jsx:227).

## Minor Observations
VT Principals missing; mobile sidebar gone, table scrolls sideways, wizard modal 720px wide, column-3 hide rule removes Email/VT tags; trash icon for a reversible move; inverted reassurance (danger dialog on undoable removal, none on budget below usage); Request credits no preview; default 10% vs proposed 25%; delete dialog promises unviewable history log; Agent vs Virtual Teammates labels; duplicate empty-state CTAs; placeholder contrast 4.4:1.

## Questions to Consider
- Should credits, not %, be the primary budget input?
- Should Unallocated be the hero CTA until it reaches zero?
- Is the monthly period the missing dimension for chargeback?
- Would the specced drawer beat a modal for rebalancing?
