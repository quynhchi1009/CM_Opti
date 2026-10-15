---
target: the user flow for this prototype
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/chi.lai/CM/prototype/index.html"
target_fingerprint: "sha256:10b1d645b9e3ae34bda1ea2d07b573230508719792bf3676452103d08bba97d4"
target_path: /Users/chi.lai/CM/prototype/index.html
timestamp: 2026-10-13T13-37-11Z
slug: prototype-index-html
---
# Critique: Credits flow (prototype/index.html)
Score 28/40 (Good, low band). Dual-agent run.

Priority issues
- [P1] No page-level status roll-up; over-budget rows offer no way out ("usage continues" only in drawer). Fix: summary line + chips, "Raise to cover usage". Commands: layout, clarify
- [P1] Budget set blind in wizard step 2 / over-budget Manage; arbitrary 10% default. Fix: show member usage, suggestion chip, explain default, top consumers on Usage tab. Command: shape
- [P2] No efficiency path (create another, remembered %, Clear filters resets to Any department). Command: layout
- [P2] Create success quiet: no contact default, 5s toast without action, empty auto-expanded row. Command: onboard
- [P2] Touch targets <44px on mobile, background not inert, no scroll lock, name error on blur, Screens button/toasts overlap footer. Commands: adapt, harden

Heuristics: 3,3,3,3,3,2,2,3,3,3
Detector: source scans 0 findings (weak); URL scan 3 (cramped-padding likely FP, thin-border-wide-shadow advisory, overused-font Inter).
