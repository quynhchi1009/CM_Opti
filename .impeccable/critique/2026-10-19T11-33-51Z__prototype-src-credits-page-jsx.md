---
target: batch states
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/chi.lai/CM/prototype/src/credits-page.jsx"
target_fingerprint: "sha256:207343de2fa8330ab3371e21e3f0339e46b5866503f4f8ae7a8842d62199f19d"
target_path: /Users/chi.lai/CM/prototype/src/credits-page.jsx
timestamp: 2026-10-19T11-33-51Z
slug: prototype-src-credits-page-jsx
---
Method: dual-agent (A: acff223fcf6ef0edf · B: a8abde306c27f0d0a)

# Critique: credit batch states (Organization Credit Summary)

User feedback: "I am feeling it too overwhelmed."

## Why it feels overwhelming
Too much at equal weight, repeated numbers, and a page below that raises the volume. Most decision-relevant number ("credits remaining") is the quietest. Batch table auto-opens in states 2, 3, 5. Four status vocabularies within 300px. State 3 heaviest.

## Design Health Score: 24/40 (Acceptable)
1 Visibility 3 · 2 Real world 2 · 3 Control 3 · 4 Consistency 2 · 5 Error prevention 3 · 6 Recognition 2 · 7 Flexibility 2 · 8 Minimalist 1 · 9 Error recovery 3 · 10 Help 3

## Design Specificity Verdict
Generic. Detector: 0 findings (index.html, src). Measurements: contrast all pass (lowest 5.20 Expired badge); focus rings present; batch toggle 29px tall (<44px); table scrolls inside card at 375px.

## What's Working
1. State 1 headline reads in one glance.
2. Status is text plus color.
3. Copy mostly avoids implying blocking.

## Priority Issues
- [P1] Everything same weight, numbers repeat. Fix: remaining as 20px second line; one muted "of total" line; move allocation items to department header. (distill, layout)
- [P1] Batch table opens by default, clips narrow. Fix: collapsed except state 7; summary toggle label; stacked rows below 640px. (adapt)
- [P1] Exhausted/expired read as alarms, reassurance last. Fix: lead with "Your team can still use Opal."; info tone, role=status; neutral bar at 100%; drop duplicate Request link in state 8. (clarify, quieter)
- [P2] Zero-pool states don't reconcile. Fix: hide allocation row at pool 0; "No active credits" instead of empty bar. (harden)
- [P2] Credit limit section below breaks calm voice. Fix: one-line row below department table. (distill)

## Persona Red Flags
Jordan: three "remaining" numbers; state 3 reads as bug; state 6 reads as outage. Sam: role=alert on load; color-only full bar; status off-screen when zoomed; dismissal not restorable. Org admin: wants remaining, card leads with consumed; Request credits quieter than Add department budget.

## Minor Observations
Orphan bullet at 100% used on mobile; 70px gap between allocation items; two info icons; 29px toggle; "credit batch" jargon.

## Questions to Consider
One number only: consumed or remaining? What action follows reading it? Is single-batch the real default?
