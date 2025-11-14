# Loom GA Launch - RACI Matrix

**Document Owner:** Program Manager
**Last Updated:** 2025-11-12
**Status:** Active

---

## 1. RACI Legend

- **R - Responsible:** Person(s) who do the work to complete the task
- **A - Accountable:** Person who is ultimately answerable for the task (only ONE person)
- **C - Consulted:** People who provide input and expertise (two-way communication)
- **I - Informed:** People who are kept up-to-date on progress (one-way communication)

**Key Principles:**
- Each task must have exactly ONE "A" (Accountable)
- Tasks may have multiple "R" (Responsible)
- Minimize "C" to avoid consensus paralysis
- Use "I" for broad stakeholder awareness

---

## 2. Team Roles Reference

| Abbreviation | Role |
|--------------|------|
| **PM** | Program Manager (Launch DRI) |
| **PL** | Product Lead |
| **EL** | Engineering Lead |
| **DL** | Design Lead |
| **QL** | QA/Testing Lead |
| **DV** | DevOps Lead |
| **ML** | Marketing Lead |
| **CS** | Customer Success Lead |
| **AL** | Analytics Lead |
| **SE** | Security Engineer |
| **VP** | VP of Product |
| **CTO** | Chief Technology Officer |
| **CEO** | Chief Executive Officer |

---

## 3. Marketing & Go-to-Market

### 3.1 Marketing Activities

| Activity | PM | PL | EL | DL | ML | CS | AL | VP | Notes |
|----------|----|----|----|----|----|----|----|----|-------|
| **Marketing Strategy** | C | C | I | C | **A** | C | C | I | ML owns GTM approach |
| **Brand Messaging** | I | C | - | C | **A** | I | I | I | ML defines value props |
| **Content Creation (Blog Posts)** | I | C | - | C | **A/R** | C | - | I | ML writes or delegates |
| **Social Media Campaign** | I | C | - | C | **A/R** | I | - | I | ML manages channels |
| **Landing Page Design** | I | C | - | **A/R** | C | - | - | I | DL owns design, ML approves copy |
| **Product Demo Videos** | I | C | - | **A/R** | C | C | - | I | DL creates, ML provides script |
| **Email Announcements** | C | C | - | C | **A/R** | C | - | I | ML sends to users/prospects |
| **Press Release** | I | C | - | - | **A/R** | - | - | C | ML coordinates PR |
| **Launch Event Planning** | **A** | C | - | C | R | C | - | I | PM coordinates, ML executes |
| **Customer Testimonials** | I | C | - | C | R | **A** | - | I | CS gathers, ML publishes |
| **SEO Optimization** | - | I | - | C | **A/R** | - | - | - | ML owns search strategy |
| **Paid Advertising Setup** | I | C | - | C | **A/R** | - | **C** | I | ML manages campaigns, AL tracks |

**Accountable Summary:**
- **Marketing Lead:** Overall GTM strategy, content, campaigns, PR

---

## 4. Onboarding Experience

### 4.1 User Onboarding

| Activity | PM | PL | EL | DL | ML | CS | QL | VP | Notes |
|----------|----|----|----|----|----|----|----|----|-------|
| **Onboarding Flow Design** | C | **A** | C | R | C | C | I | I | PL defines experience, DL executes |
| **UI/UX Implementation** | I | C | R | **A** | I | C | I | I | DL owns design quality |
| **Frontend Development** | I | C | **A/R** | C | - | I | C | - | EL implements onboarding screens |
| **User Testing** | I | C | C | R | - | C | **A** | I | QL runs usability tests |
| **Copy & Messaging** | I | **A** | - | C | C | C | - | I | PL owns in-product copy |
| **Tutorial Videos** | I | C | - | **A/R** | C | C | - | I | DL creates, CS reviews |
| **Help Documentation** | I | C | - | C | C | **A/R** | - | I | CS writes user guides |
| **Tooltips & Hints** | I | **A** | R | C | - | C | I | - | PL defines, EL implements |
| **Email Drip Campaign** | I | C | - | C | R | **A** | - | I | CS schedules onboarding emails |
| **Completion Tracking** | I | **A** | R | - | - | C | C | I | PL defines metrics, EL instruments |
| **A/B Testing Setup** | I | **A** | R | - | - | C | C | I | PL owns experiments, AL analyzes |
| **Localization (Hebrew)** | I | **A** | R | C | C | C | I | - | PL manages translations |

**Accountable Summary:**
- **Product Lead:** Onboarding strategy, flow, copy, metrics
- **Design Lead:** UX design, tutorial videos
- **Engineering Lead:** Implementation
- **Customer Success:** Documentation, email campaigns

---

## 5. Dashboard & Analytics

### 5.1 Dashboard Development

| Activity | PM | PL | EL | DL | AL | CS | QL | CTO | Notes |
|----------|----|----|----|----|----|----|----|----|-------|
| **Coach Dashboard Design** | I | C | C | **A** | C | I | I | - | DL owns UI/UX |
| **Client Dashboard Design** | I | C | C | **A** | C | I | I | - | DL owns UI/UX |
| **Dashboard Implementation** | I | C | **A/R** | C | C | - | C | I | EL builds dashboards |
| **Data Model Design** | I | C | **A** | I | C | - | I | C | EL owns data architecture |
| **Real-Time Data Sync** | I | C | **A/R** | - | C | - | C | I | EL implements Supabase Realtime |
| **Performance Optimization** | I | I | **A/R** | I | I | - | C | C | EL optimizes queries & rendering |
| **Mobile Responsiveness** | I | C | R | **A** | - | I | C | - | DL ensures mobile UX |
| **Analytics Instrumentation** | I | C | R | - | **A** | I | I | - | AL implements tracking |
| **KPI Dashboard (Internal)** | C | C | C | - | **A/R** | I | - | C | AL creates admin analytics |
| **Reporting Automation** | I | C | R | - | **A** | C | - | - | AL builds reports |
| **A/B Testing Framework** | I | **A** | R | - | C | - | C | - | PL owns experiments, AL supports |
| **Dashboard QA Testing** | I | I | C | I | - | - | **A/R** | - | QL validates functionality |

**Accountable Summary:**
- **Design Lead:** Dashboard UX/UI, mobile responsiveness
- **Engineering Lead:** Implementation, data model, performance
- **Analytics Lead:** Instrumentation, reporting, internal KPI dashboards

---

## 6. Messaging & Notifications

### 6.1 Messaging System

| Activity | PM | PL | EL | DL | CS | QL | CTO | Notes |
|----------|----|----|----|----|----|----|-----|-------|
| **Messaging UX Design** | I | C | C | **A** | C | I | - | DL owns chat interface |
| **Real-Time Messaging Implementation** | I | C | **A/R** | C | - | C | C | EL builds Supabase Realtime integration |
| **Message Encryption** | I | C | **A** | - | - | C | C | EL implements, CTO approves |
| **File Attachments** | I | C | **A/R** | C | - | C | I | EL implements upload/download |
| **Read Receipts** | I | **A** | R | C | C | I | - | PL defines behavior, EL builds |
| **Message Reactions** | I | **A** | R | C | - | I | - | PL defines feature, EL implements |
| **Typing Indicators** | I | **A** | R | C | - | I | - | PL defines, EL implements |
| **Conversation Threading** | I | **A** | R | C | - | I | - | PL owns structure, EL builds |
| **Message Search** | I | **A** | R | - | - | C | I | PL defines functionality, EL implements |
| **Messaging Analytics** | I | C | R | - | **A** | - | - | AL tracks engagement |
| **Messaging QA** | I | I | C | I | - | **A/R** | - | QL tests edge cases |

### 6.2 Notifications System

| Activity | PM | PL | EL | DV | CS | QL | CTO | Notes |
|----------|----|----|----|----|----|----|-----|-------|
| **Notification Strategy** | C | **A** | C | - | C | - | - | PL defines notification types & triggers |
| **In-App Notifications UI** | I | C | C | **A** | - | I | - | DL designs notification center |
| **Email Notification Templates** | I | C | - | C | **A** | I | - | CS writes email copy |
| **SMS Notifications (OTP)** | I | C | **A/R** | C | - | C | C | EL integrates Twilio |
| **Push Notifications** | I | **A** | R | R | - | C | I | PL owns strategy, EL+DV implement |
| **Notification Preferences** | I | **A** | R | C | C | I | - | PL defines settings, EL implements |
| **Email Service Integration** | I | I | **A/R** | R | - | C | C | EL integrates SendGrid/Postmark |
| **Rate Limiting** | I | C | **A** | - | - | C | C | EL prevents spam, CTO reviews |
| **Notification Analytics** | I | C | R | - | **A** | - | - | AL tracks open rates, CTR |
| **Unsubscribe Management** | I | **A** | R | - | C | C | I | PL defines policy, EL implements |
| **Notification Testing** | I | I | C | I | - | **A/R** | - | QL validates delivery |

**Accountable Summary:**
- **Design Lead:** Messaging UI, notification center design
- **Engineering Lead:** Real-time messaging, email/SMS integration, encryption
- **Product Lead:** Messaging features, notification strategy, preferences
- **Analytics Lead:** Messaging and notification analytics
- **Customer Success:** Email copy and templates

---

## 7. Resource Library

### 7.1 Resource Management

| Activity | PM | PL | EL | DL | CS | QL | CTO | Notes |
|----------|----|----|----|----|----|----|-----|-------|
| **Resource Library Strategy** | I | **A** | C | C | C | - | - | PL defines feature scope |
| **UI/UX Design** | I | C | C | **A** | C | I | - | DL designs library interface |
| **File Upload Implementation** | I | C | **A/R** | - | - | C | C | EL implements Supabase Storage |
| **Category & Tag System** | I | **A** | R | C | C | I | - | PL defines taxonomy, EL builds |
| **Collections Feature** | I | **A** | R | C | C | C | - | PL owns feature, EL implements |
| **Resource Sharing** | I | **A** | R | - | C | C | I | PL defines permissions, EL builds |
| **Progress Tracking** | I | **A** | R | - | C | C | - | PL defines tracking, EL implements |
| **Analytics Dashboard** | I | C | R | C | **A** | I | - | AL creates analytics views |
| **Auto-Share Configuration** | I | **A** | R | - | C | I | - | PL owns feature, EL implements |
| **File Type Support** | I | C | **A** | - | - | C | C | EL defines supported formats |
| **Storage Optimization** | I | I | **A/R** | - | - | I | C | EL optimizes storage costs |
| **Resource Library QA** | I | I | C | I | - | **A/R** | - | QL tests upload, sharing, tracking |

**Accountable Summary:**
- **Product Lead:** Resource library strategy, features, taxonomy
- **Design Lead:** UI/UX design
- **Engineering Lead:** Implementation, file upload, storage
- **Analytics Lead:** Resource analytics dashboard

---

## 8. Session Management

### 8.1 Session Booking & Lifecycle

| Activity | PM | PL | EL | DL | DV | CS | QL | Notes |
|----------|----|----|----|----|----|----|----|----|
| **Session Booking Flow** | I | **A** | C | R | - | C | I | PL owns UX, DL designs |
| **Calendar Integration** | I | C | **A/R** | - | - | C | C | EL implements availability system |
| **Scheduling Logic** | I | **A** | R | - | - | C | C | PL defines rules, EL implements |
| **Session Reminders** | I | **A** | R | - | R | C | I | PL defines triggers, EL+DV implement |
| **Session Notes** | I | **A** | R | C | - | C | I | PL owns feature, EL implements |
| **Session Status Tracking** | I | **A** | R | - | - | C | C | PL defines lifecycle, EL implements |
| **Rescheduling/Cancellation** | I | **A** | R | C | - | C | C | PL defines policy, EL implements |
| **Session History** | I | **A** | R | C | - | C | I | PL owns feature, EL builds |
| **Timezone Handling** | I | C | **A/R** | - | - | - | C | EL implements i18n datetime |
| **Session Analytics** | I | C | R | - | - | **A** | - | AL tracks session metrics |
| **Booking QA** | I | I | C | I | - | - | **A/R** | QL tests booking edge cases |

**Accountable Summary:**
- **Product Lead:** Session features, booking flow, policies
- **Engineering Lead:** Implementation, calendar logic, timezones
- **Design Lead:** Booking UI/UX
- **Analytics Lead:** Session analytics

---

## 9. Authentication & Security

### 9.1 Authentication

| Activity | PM | PL | EL | SE | DV | QL | CTO | Notes |
|----------|----|----|----|----|----|----|-----|-------|
| **Auth Strategy** | I | C | C | **A** | C | - | C | SE owns security architecture |
| **Email/Password Auth** | I | C | **A/R** | C | - | C | C | EL implements Supabase Auth |
| **Multi-Factor Auth (MFA)** | I | C | **A/R** | C | - | C | C | EL implements TOTP & SMS OTP |
| **Password Reset Flow** | I | **A** | R | C | - | C | I | PL owns UX, EL implements |
| **Session Management** | I | C | **A/R** | C | C | - | C | EL implements token refresh |
| **Role-Based Access Control** | I | C | **A** | C | - | C | C | EL implements RLS policies |
| **Security Audit** | **A** | I | R | R | R | C | C | PM coordinates, SE+EL execute |
| **Penetration Testing** | **A** | I | C | R | C | - | C | PM schedules, SE executes |
| **Auth QA Testing** | I | I | C | C | - | **A/R** | I | QL tests auth flows |

### 9.2 Data Security

| Activity | PM | PL | EL | SE | DV | QL | CTO | Notes |
|----------|----|----|----|----|----|----|-----|-------|
| **Row-Level Security (RLS)** | I | C | **A/R** | C | - | C | C | EL implements all RLS policies |
| **Encryption at Rest** | I | - | C | **A** | R | - | C | SE ensures Supabase encryption |
| **Encryption in Transit** | I | - | C | **A** | R | - | C | SE validates SSL/TLS |
| **API Security** | I | C | **A/R** | C | - | C | C | EL implements rate limiting, auth |
| **Secret Management** | I | - | R | **A** | R | - | C | SE manages secrets rotation |
| **GDPR Compliance** | I | **A** | C | C | - | - | C | PL owns compliance (future) |
| **Security Monitoring** | I | - | C | **A** | R | - | C | SE configures Sentry, alerts |
| **Incident Response Plan** | **A** | C | C | R | R | - | C | PM owns plan, SE leads response |

**Accountable Summary:**
- **Security Engineer:** Auth strategy, security architecture, audits, monitoring
- **Engineering Lead:** Auth implementation, RLS, API security
- **Product Lead:** Password reset UX, GDPR compliance
- **Program Manager:** Security audit coordination, incident response planning

---

## 10. Infrastructure & DevOps

### 10.1 Infrastructure

| Activity | PM | EL | DV | SE | QL | CTO | Notes |
|----------|----|----|----|----|----|----|-------|
| **Production Environment Setup** | C | C | **A/R** | C | - | C | DV provisions Vercel + Supabase |
| **Database Migration Strategy** | I | **A** | R | C | C | C | EL owns migration scripts, DV executes |
| **CI/CD Pipeline** | I | C | **A/R** | C | C | I | DV configures GitHub Actions |
| **Deployment Automation** | I | C | **A/R** | - | C | I | DV automates Vercel deployments |
| **Monitoring & Alerting** | I | C | **A/R** | C | - | C | DV configures Sentry, Vercel, Supabase |
| **Backup & Disaster Recovery** | I | C | **A** | C | - | C | DV implements backup strategy |
| **SSL/TLS Configuration** | I | C | **A** | C | - | I | DV manages certificates |
| **CDN Setup** | I | C | **A/R** | - | - | I | DV configures Vercel Edge |
| **Performance Monitoring** | I | C | **A** | - | C | C | DV tracks Core Web Vitals |
| **Load Testing** | I | C | R | - | **A** | C | QL runs load tests, DV optimizes |
| **Incident Response** | **A** | C | R | R | - | C | PM coordinates, DV responds |
| **Rollback Plan** | C | **A** | R | - | C | C | EL owns rollback scripts, DV executes |

**Accountable Summary:**
- **DevOps Lead:** Infrastructure, CI/CD, monitoring, deployments, performance
- **Engineering Lead:** Database migrations, rollback plan
- **Program Manager:** Incident response coordination

---

## 11. Quality Assurance & Testing

### 11.1 Testing

| Activity | PM | PL | EL | DL | QL | DV | Notes |
|----------|----|----|----|----|----|----|-------|
| **Test Strategy** | C | C | C | - | **A** | C | QL defines testing approach |
| **Unit Testing** | I | I | **A/R** | - | C | - | EL writes unit tests |
| **Integration Testing** | I | C | **A/R** | - | C | C | EL writes integration tests |
| **E2E Testing (Playwright)** | I | C | R | - | **A** | C | QL writes & runs E2E tests |
| **Performance Testing** | I | C | C | - | **A** | R | QL runs tests, DV optimizes |
| **Accessibility Testing** | I | C | C | R | **A** | - | QL validates, DL fixes |
| **Security Testing** | I | I | C | - | **A** | C | QL runs OWASP checks |
| **Cross-Browser Testing** | I | C | C | R | **A** | - | QL tests browsers, DL fixes |
| **Mobile Testing** | I | C | C | R | **A** | - | QL tests mobile, DL fixes |
| **Regression Testing** | I | I | C | - | **A/R** | - | QL runs before each deploy |
| **User Acceptance Testing** | C | **A** | I | I | R | - | PL coordinates UAT, QL executes |
| **Test Reporting** | I | C | C | - | **A** | - | QL reports to stakeholders |

**Accountable Summary:**
- **QA/Testing Lead:** Test strategy, E2E tests, performance, accessibility, reporting
- **Engineering Lead:** Unit and integration tests

---

## 12. Product & Feature Development

### 12.1 Feature Delivery

| Activity | PM | PL | EL | DL | QL | VP | CTO | Notes |
|----------|----|----|----|----|----|----|-----|-------|
| **Product Roadmap** | C | **A** | C | C | - | C | C | PL owns prioritization, VP approves |
| **Feature Specifications** | I | **A/R** | C | C | - | I | - | PL writes specs |
| **Technical Design** | I | C | **A/R** | I | - | - | C | EL designs architecture |
| **UI/UX Design** | I | C | C | **A/R** | - | I | - | DL creates designs |
| **Frontend Development** | I | C | **A/R** | C | C | - | - | EL leads frontend team |
| **Backend Development** | I | C | **A/R** | - | C | - | C | EL leads backend team |
| **Code Review** | I | I | **A** | I | - | - | C | EL enforces code quality |
| **Feature QA** | I | C | C | I | **A/R** | - | - | QL validates features |
| **Feature Documentation** | I | **A** | I | - | I | - | - | PL writes user docs |
| **Feature Launch** | **A** | R | R | R | R | I | I | PM coordinates launch |
| **Post-Launch Monitoring** | C | C | R | - | - | - | **A** | CTO monitors production |

**Accountable Summary:**
- **Product Lead:** Roadmap, specs, documentation
- **Engineering Lead:** Technical design, development, code review
- **Design Lead:** UI/UX design
- **QA Lead:** Feature validation
- **Program Manager:** Feature launch coordination
- **CTO:** Post-launch monitoring

---

## 13. Customer Success & Support

### 13.1 Support Operations

| Activity | PM | PL | EL | CS | AL | ML | Notes |
|----------|----|----|----|----|----|----|-------|
| **Support Playbook** | I | C | C | **A/R** | - | - | CS writes support procedures |
| **Team Training** | C | C | C | **A** | - | - | CS trains support team |
| **Help Documentation** | I | C | - | **A/R** | - | C | CS writes FAQs, guides |
| **Video Tutorials** | I | C | - | **A** | - | C | CS creates or coordinates with DL |
| **Support Ticket Triage** | I | C | C | **A** | - | - | CS manages incoming tickets |
| **Bug Escalation** | I | C | R | **A** | - | - | CS escalates to engineering |
| **Customer Feedback Collection** | I | **A** | - | R | C | - | PL owns feedback loop, CS gathers |
| **NPS Surveys** | I | **A** | - | R | C | - | PL defines, CS sends, AL analyzes |
| **Support Analytics** | I | C | - | C | **A** | - | AL tracks ticket volume, CSAT |
| **Customer Communication** | I | C | - | **A** | - | C | CS sends updates, ML approves messaging |
| **Onboarding Support** | I | C | - | **A** | - | - | CS assists new users |

**Accountable Summary:**
- **Customer Success Lead:** Support playbook, training, documentation, tickets, onboarding
- **Product Lead:** Customer feedback loop, NPS surveys
- **Analytics Lead:** Support analytics

---

## 14. Program Management & Coordination

### 14.1 Launch Coordination

| Activity | PM | PL | EL | ML | CS | VP | CTO | CEO | Notes |
|----------|----|----|----|----|----|----|-----|-----|-------|
| **Launch Timeline** | **A/R** | C | C | C | C | C | C | I | PM owns timeline |
| **Risk Register** | **A** | R | R | R | R | C | C | I | PM maintains, teams report |
| **Dependency Tracking** | **A** | C | C | C | C | - | - | - | PM tracks dependencies |
| **Status Reporting** | **A/R** | C | C | C | C | I | I | I | PM publishes reports |
| **Stakeholder Communication** | **A** | C | C | C | C | I | I | I | PM coordinates comms |
| **Weekly Checkpoint Meetings** | **A/R** | R | R | R | R | I | I | - | PM runs meetings |
| **Go/No-Go Decision (Alpha)** | C | **A** | C | I | I | C | C | I | PL decides, VP approves |
| **Go/No-Go Decision (Beta)** | C | **A** | C | C | C | C | C | I | PL decides, VP approves |
| **Go/No-Go Decision (GA)** | C | C | C | C | C | **A** | C | C | VP decides, CEO final |
| **Launch Day Coordination** | **A/R** | R | R | R | R | I | C | I | PM runs launch day |
| **Post-Launch Retrospective** | **A** | R | R | R | R | C | C | - | PM facilitates retro |
| **Budget Management** | **A** | I | I | I | I | C | C | I | PM tracks spend |

**Accountable Summary:**
- **Program Manager:** Timeline, risk, dependencies, status, meetings, launch coordination, budget
- **Product Lead:** Alpha/Beta go/no-go
- **VP Product:** GA go/no-go
- **CEO:** Final GA approval

---

## 15. Summary of Key Accountabilities

### By Functional Area

| Functional Area | Primary Accountable |
|-----------------|---------------------|
| **Marketing & GTM** | Marketing Lead |
| **Onboarding UX** | Product Lead |
| **Onboarding Documentation** | Customer Success Lead |
| **Dashboards (UI/UX)** | Design Lead |
| **Dashboards (Implementation)** | Engineering Lead |
| **Analytics & Reporting** | Analytics Lead |
| **Messaging** | Engineering Lead (tech), Product Lead (features) |
| **Notifications** | Product Lead (strategy), Engineering Lead (implementation) |
| **Resource Library** | Product Lead (strategy), Engineering Lead (implementation) |
| **Session Management** | Product Lead (features), Engineering Lead (implementation) |
| **Authentication** | Engineering Lead (implementation), Security Engineer (architecture) |
| **Security** | Security Engineer |
| **Infrastructure** | DevOps Lead |
| **Testing & QA** | QA/Testing Lead |
| **Product Features** | Product Lead |
| **Support** | Customer Success Lead |
| **Program Management** | Program Manager |

### By Team Lead

#### Program Manager
- Launch timeline and coordination
- Risk and dependency management
- Status reporting and stakeholder communication
- Go/no-go meeting facilitation
- Budget tracking

#### Product Lead
- Product roadmap and prioritization
- Feature specifications
- Onboarding experience
- User feedback and NPS
- Alpha/Beta go/no-go decisions

#### Engineering Lead
- Technical architecture and implementation
- Code quality and testing
- Database design and migrations
- Messaging and API development
- Rollback planning

#### Design Lead
- UI/UX design for all features
- Design system consistency
- Mobile responsiveness
- Accessibility compliance
- Tutorial video creation

#### Marketing Lead
- Go-to-market strategy
- Content creation (blog, social, email)
- PR and launch event coordination
- Brand messaging

#### Customer Success Lead
- Support playbook and training
- Help documentation
- Onboarding support
- Customer feedback collection
- Support ticket management

#### QA/Testing Lead
- Test strategy
- E2E, performance, and accessibility testing
- Quality gate validation
- Test reporting

#### DevOps Lead
- Production infrastructure
- CI/CD pipelines
- Monitoring and alerting
- Deployment automation
- Performance optimization

#### Analytics Lead
- KPI dashboards
- Analytics instrumentation
- Reporting automation
- Data analysis and insights

#### Security Engineer
- Security architecture
- Security audits
- Penetration testing
- Security monitoring
- Secret management

---

## 16. Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-12 | 1.0 | Program Team | Initial RACI matrix |

---

**Document Status:** ACTIVE
**Next Review:** 2025-11-19
**Related Documents:**
- [GA Scope and Success Metrics](./GA_SCOPE_AND_SUCCESS_METRICS.md)
- [Cross-Functional Working Group](./CROSS_FUNCTIONAL_WORKING_GROUP.md)
- [Rollout Communications Plan](./ROLLOUT_COMMUNICATIONS_PLAN.md)
- [Implementation Schedule](./IMPLEMENTATION_SCHEDULE.md)
