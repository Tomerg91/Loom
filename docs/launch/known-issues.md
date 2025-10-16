# Known Issues

Document unresolved bugs or constraints that stakeholders must acknowledge before launch. Update the status column as work progresses.

| ID     | Title                                         | Impact                                              | Workaround                                                                       | Owner              | Status                                       |
| ------ | --------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------ | -------------------------------------------- |
| KI-001 | Calendar sync delays with Google Calendar     | Sessions created in Loom appear after ~5 minutes    | Inform coaches during onboarding; manual refresh recommended                     | Integrations Squad | Investigating root cause with Google support |
| KI-002 | Hebrew locale missing glossary definitions    | Some dashboard tooltips fall back to English        | Provide supplemental PDF glossary in welcome email                               | Localization PM    | Translation vendor ETA 2025-10-30            |
| KI-003 | Performance test flakiness on low-end Android | Lighthouse mobile score can dip below 80 on Moto G6 | Monitor analytics for affected devices; prioritize PWA optimizations post-launch | Frontend Chapter   | Mitigation planned Sprint 34                 |
| KI-004 | Billing invoices limited to PDF download      | No HTML email receipts for payments                 | Manual invoice emails via finance when requested                                 | Finance Ops        | Awaiting Stripe Billing upgrade              |

## Acceptance Criteria

- Stakeholders sign off on all open items during go/no-go review.
- Any new issue discovered post-launch is appended with timestamp and communication notes.
- Archive resolved issues at the bottom of the file to preserve audit trail.

> Keep this log in sync with the `launch-blocker` and `launch-followup` GitHub labels for consistency.
