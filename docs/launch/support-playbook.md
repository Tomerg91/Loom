# Support Playbook

A reference guide for triaging, resolving, and communicating user-facing issues during and after launch.

## 1. Support Channels

- **In-App Feedback Widget**: Routes to support@loom-app.com inbox with Zendesk integration.
- **Email**: support@loom-app.com (monitored 08:00–22:00 IST).
- **Slack**: `#support` for internal collaboration, `#status` for status updates.
- **Emergency Hotline**: +1-555-010-4242 (on-call engineer).

## 2. Roles & Responsibilities

| Role                   | Primary Duties                                                        | Escalation Target   |
| ---------------------- | --------------------------------------------------------------------- | ------------------- |
| Support Agent (Tier 1) | Intake tickets, provide knowledge base responses, collect repro steps | Support Lead        |
| Support Lead (Tier 2)  | Validate bugs, prioritize severity, coordinate with engineering       | Engineering On-Call |
| Engineering On-Call    | Debug technical issues, patch hotfixes, update incident timeline      | Engineering Manager |
| Product Manager        | Communicate customer impact, approve remediation plans                | Leadership          |

## 3. Severity Levels

| Severity | Description                                | Response SLA             | Communication                      |
| -------- | ------------------------------------------ | ------------------------ | ---------------------------------- |
| SEV0     | Platform outage or data loss               | Immediate (within 5 min) | Status page + all-hands Slack ping |
| SEV1     | Critical feature unavailable for all users | 15 min                   | Status page + #support update      |
| SEV2     | Feature degraded for subset of users       | 1 hour                   | Ticket comment + #support          |
| SEV3     | Minor bug or cosmetic issue                | 1 business day           | Ticket comment                     |

## 4. Triage Workflow

1. Triage owner reviews new tickets every 30 minutes during business hours.
2. Capture required context: affected email, browser, locale, timestamp, screenshots.
3. Assign severity and log in incident template.
4. For SEV0/SEV1, page engineering on-call immediately via PagerDuty.
5. Add ticket to linear issue tracker with `support` label and link to original request.

## 5. Incident Response Template

```
### Summary
- Impacted feature/flow
- Start time
- Current status

### Detection
- How reported
- Monitoring signals

### Mitigation
- Immediate actions taken
- Next steps

### Communication
- Customer update
- Internal update

### Follow-up
- Root cause analysis owner
- Preventative tasks
```

## 6. Post-Incident Review

- Schedule review within 3 business days of resolution.
- Document root cause, contributing factors, and corrective actions in Confluence.
- File Jira tasks for remediation with target sprint.
- Share learnings during weekly engineering sync.

## 7. Knowledge Base Maintenance

- Review top 20 inbound topics monthly and update saved replies.
- Publish new articles for any issue resolved more than twice via custom workaround.
- Archive outdated articles when flows or UI change.

## 8. Tooling Checklist

- [ ] Zendesk macros updated for new dashboard features.
- [ ] Status page integration tested with sandbox incident.
- [ ] PagerDuty schedule confirmed for launch window.
- [ ] Loom video templates prepared for walkthrough responses.

Keep this playbook accessible to all customer-facing teams and iterate after each incident to improve response quality.
