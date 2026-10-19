# Hard limit: further stakeholders and risks

Extra material for the "What it means for people using Opal today" section of [hard-limit-overview.html](hard-limit-overview.html). Decision codes (D1 to D6) match the matrix on that page.

| Code | Decision |
| --- | --- |
| D1 | Enforce at org level |
| D2 | Temporary override |
| D3 | Auto-resume |
| D4 | Department enforcement |
| D5 | Data lag |
| D6 | What users see |

## Further stakeholders

| Who | Today | After the hard limit is on | Decisions |
| --- | --- | --- | --- |
| Billing or finance owner at the customer | Uses department figures for chargeback. | People blocked by the shared pool can skew department numbers. Overrides need a recorded reason so finance can explain them. | D2, D4 |
| Virtual Teammate owner | Virtual Teammates always run and nobody has to watch them. | They stop with no banner to read. Each needs a named owner who is told when it is blocked. | D1, D3 |
| Systems calling Opal by API or integration | Calls always succeed. | Calls fail at the limit. They need a clear error code, and admins need a webhook or Slack alert (the research recommends both). | D1, D3 |
| Support and Customer Success | Credit tickets are about visibility. | Expect a spike on the day a limit is reached. Prepare one standard answer and a self-serve path for admins. | D1, D6 |
| Security and compliance | No limit controls to govern. | Switching and overriding the limit change what the whole org can do. Decide whether Billing Admins or only Super Admins can do it, and keep an audit log. | D1, D2 |

## Risks to cover

### Limit drops when an allotment ends
Orgs can hold several allotments with different end dates (see [PRODUCT.md](../../PRODUCT.md)). When one expires, the pool shrinks and the limit can be reached with no new usage. Warn admins before an expiry date.

### Alerts are email only today
The MON team sends alerts by email only. The in-app alert shown in the enforcement flow is an assumption to confirm. With a data lag of about 2 hours (PRODUCT.md says about 6 hours; confirm which), an admin may learn of the stop late.

### Half-finished work
A run stopped partway can leave a workflow in a mixed state. Define a safe rollback up front, and let running tasks finish before the block takes effect.

## Matrix rows for the risks above

| Element | D1 | D2 | D3 | D4 | D5 | D6 |
| --- | --- | --- | --- | --- | --- | --- |
| Allotment expiry (contract term, Credits tab) | Behavior: limit shrinks when an allotment ends, warn before it | none | none | none | Wording: show the next expiry beside the limit | none |
| Alert delivery (email by the MON team) | Behavior: confirm in-app alerts, or rely on email | none | Wording: tell recipients when work resumed | none | Behavior: lag delays the 100% alert | none |
| API and integration calls | New: error code when blocked | none | New: retry or resume signal | none | none | none |
| Virtual Teammates (usage section and owner) | Behavior: blocked with no banner to read, notify the owner | none | New: "will resume" status | none | none | none |
| Permissions (who can switch or override) | Behavior: decide Super Admin or Billing Admin | Behavior: same decision, plus a reason field | none | Behavior: who can extend a department | none | none |
| Half-finished work (runs stopped partway) | Behavior: in-flight tasks finish first | none | Behavior: resume from where it stopped, not from the start | none | none | none |

## Decision × UI element matrix

Behavior = changes how it works. Wording = changes labels or copy. New = a new element. A dash means no change.

| UI element | D1 Enforce at org level | D2 Temporary override | D3 Auto-resume | D4 Department enforcement | D5 Data lag | D6 What users see |
| --- | --- | --- | --- | --- | --- | --- |
| **Current screens** | | | | | | |
| Organization Credit Summary (Credits tab, top card) | Behavior: Bar and remaining become the stop point | Behavior: Shows 'raised until' while active | – | – | Wording: Add 'as of' next to remaining | – |
| Section subtitle and roll-up ('Usage is never blocked', 'Usage continues either way') | Wording: False once the limit is on. Make it conditional | – | – | Wording: Rewrite if departments can be blocked | – | – |
| Department table (budget, consumed, status badge) | Behavior: A department under budget can still be paused by the org limit | – | – | Behavior: Per-department Blocked status | Wording: As-of time on consumed | – |
| Manage drawer: usage summary ('over budget · usage continues') | Wording: Add an 'org limit reached' state above department state | – | – | Behavior: 'Usage continues' becomes 'paused at limit' | Wording: As-of time | – |
| Manage drawer: budget (slider, 'Raise to') | – | – | – | Behavior: 'Raise to' becomes the extension path | – | – |
| Alerts line and recipients (75 / 90 / 100%, fixed recipients) | Behavior: Org alerts are 50 / 75 / 90 / 95 / 100. Align the two sets | New: Alert when an override is used | Wording: Add 'resumed' notice | – | – | – |
| Create department wizard (budget step) | – | – | – | Behavior: Add an 'enforce this budget' choice | – | – |
| Request credits dialog | Behavior: Becomes the main exit when blocked | Wording: Admin can answer with a raise | – | – | – | Behavior: Users send requests through it |
| Credit limit card (switch, confirm dialogs) | Behavior: Core control, already built | New: 'Raise temporarily' action | New: Auto-resume setting | – | Wording: Last-updated time | – |
| Usage breakdown and charts | Wording: Limit line and stop marker | – | – | – | Wording: Freshness stamp | – |
| Allocation history | Wording: Log limit on and off | New: Override entries with reason | Wording: Log auto-resume | Wording: Log extensions | – | – |
| **In Opal** | | | | | | |
| Chat and purple buttons | Behavior: Disabled at the limit, with a tooltip | – | – | – | Behavior: Pre-check before large actions | New: Notice at 90% |
| Agent activity logs and usage report | New: 'Blocked, limit reached' status, 0 credits | – | New: 'Will resume' status | – | – | – |
| **New elements** | | | | | | |
| Limit-reached banner (Admin Center) | New: Built in the prototype | – | – | – | – | – |
| Override dialog (reason, amount, end date) | – | New: New | – | New: Reused for extensions | – | – |
| Audit log view | New: On/off changes | New: Every override | New: Every resume | New: Every extension | – | – |
| 'Ask your admin' button (in Opal, when paused) | – | – | – | – | – | New: New |

## Open questions

- Who may switch the limit on or off, and who may override it: Super Admin only, or Billing Admin too?
- Who is told when a Virtual Teammate is blocked?
- Do in-app alerts exist, or is email the only channel?
- Is the usage data lag about 2 hours or about 6 hours?
- What is the safe rollback for a workflow stopped partway?
