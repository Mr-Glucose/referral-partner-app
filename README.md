# Astoria Referrals

**Turning a referral intake workflow into a usable AI-powered triage system**

[![Live App](https://img.shields.io/badge/Live-Astoria%20Referrals-2bbbad.svg)](https://astoria-referrals.lovable.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![n8n](https://img.shields.io/badge/n8n-Workflow%20Automation-orange.svg)](https://n8n.io/)
[![Claude](https://img.shields.io/badge/Claude-Multi--Agent%20AI-purple.svg)](https://www.anthropic.com/)

---

## 📘 Table of Contents

1. [The Story Behind the Project](#-the-story-behind-the-project)
2. [The Problem](#-the-problem)
3. [What I Built](#-what-i-built)
4. [Live App](#-live-app)
5. [Understanding the Business Flow](#-understanding-the-business-flow)
6. [Architecture](#️-architecture)
7. [The AI Agent Team](#-the-ai-agent-team)
8. [Screenshots](#-screenshots)
9. [Testing & Guardrails](#-testing--guardrails)
10. [Technical Stack](#️-technical-stack)
11. [Running Locally](#-running-locally)
12. [Project Structure](#-project-structure)
13. [Security](#-security)
14. [Known Limitations](#️-known-limitations)
15. [Next Steps](#-next-steps)
16. [What I Learned](#-what-i-learned)
17. [About This Project](#-about-this-project)

---

## 💭 The Story Behind the Project

This project started much smaller than the app you see today.

In Module 1 of the Gayiti fellowship, I built a basic n8n workflow that accepted a referral, validated the information, logged it, and sent emails.

Then each module added another layer.

**Module 2:** What happens when the workflow needs to communicate with real external systems?

**Module 3:** What happens when one prompt is no longer enough and different parts of the decision need different responsibilities?

**Module 4:** What happens when the workflow works technically, but a normal person still cannot actually use it?

That last question changed the project the most.

I did not want the final version to be something that only made sense when looking at an n8n canvas.

I wanted someone who knows nothing about n8n, APIs, or AI agents to be able to open a link, submit a referral, and understand what happened.

That became **Astoria Referrals**.

---

## 🔍 The Problem

A referral sounds simple:

> A partner sends a potential customer to a business.

But there are several decisions hiding behind that simple action:

- Is this a valid referral partner?
- What kind of insurance is the prospect asking for?
- How urgent is the request?
- Which team should handle it?
- How quickly should someone respond?
- Is enough information available to make that decision?
- What happens when the request is vague?
- How does the prospect enter the CRM?
- Who needs to be notified?

Without a system, those decisions can become manual, inconsistent, difficult to trace, or dependent on one person knowing what to do.

The goal of Astoria is **not** to let AI make insurance decisions.

The goal is to use automation and AI to help **organize, triage, route, and communicate around a referral while knowing when a human needs to take over.**

---

## 🚀 What I Built

Astoria Referrals is a live, mobile-friendly web application connected to my n8n referral workflow.

A referral partner can submit:

- Partner code
- Prospect name
- Prospect email
- Insurance intent
- Optional referral notes

The system then:

1. Validates the submission
2. Confirms the partner code
3. Generates a unique referral ID
4. Logs the referral in Google Sheets
5. Creates or updates the prospect in HubSpot
6. Sends the referral through a four-agent AI team
7. Validates each agent's output
8. Determines routing, priority, SLA, and next action
9. Generates internal and external communication
10. Sends the final result back to the web application
11. Sends the appropriate email notifications

The user sees one of three clear outcomes:

- **Ready — routed automatically**
- **Manual review required**
- **A visible validation or connection error**

---

## 🌐 Live App

### [Open Astoria Referrals](https://astoria-referrals.lovable.app)

The application is publicly accessible and designed to work on both desktop and mobile.

A referral partner does not need access to n8n or any of the systems running behind the application.

---

## 🤝 Understanding the Business Flow

One thing I had to understand more clearly while building this project was that a **partner**, a **referral**, and a **prospect** are three different things.

```text
PARTNER
Who sends the opportunity
        ↓
REFERRAL
The request moving through the system
        ↓
PROSPECT
The person or business being referred
```

For example:

```text
Partner
PARTNER002
        ↓
submits
        ↓
Referral
REF-2026-182
Auto Insurance
High Priority
4-Hour SLA
        ↓
for
        ↓
Prospect
Daniel Rivera
2024 Honda Accord
```

### Partner

A partner is someone already participating in the referral program.

The current prototype assumes that a partner has already been onboarded and assigned a code such as:

```text
PARTNER001
PARTNER002
PARTNER003
```

The partner does not generate their own code from the referral form.

### Referral

The referral is the request being processed.

Each successful referral receives a unique identifier such as:

```text
REF-2026-182
```

This is the object being triaged and routed by the workflow.

### Prospect

The prospect is the person or business being referred.

The workflow sends prospect information to HubSpot, where the email address is used to create or update the CRM contact.

That lets an existing prospect be updated rather than blindly creating another duplicate contact.

---

## 🏗️ Architecture

The browser does not communicate directly with n8n.

The application sends the form to a server-side route located at:

```text
POST /api/public/submit-referral
```

That server route validates the request again and securely forwards it to the production n8n webhook.

### End-to-End Architecture

```mermaid
flowchart TD
    A[Referral Partner] --> B[Astoria Referrals]

    B --> C["POST /api/public/submit-referral"]
    C --> D[n8n Production Webhook]

    D --> E[Validate Required Fields]
    E --> F[Validate Partner Code]
    F --> G[Generate Referral ID]

    G --> H[Google Sheets Referral Log]
    H --> I[HubSpot CRM]

    H --> J[Classifier Agent]
    H --> K[Extractor Agent]

    J --> L[Validate Classifier]
    K --> M[Validate Extractor]

    L --> N[Reasoner Agent]
    M --> N

    N --> O[Validate Reasoner]
    O --> P[Composer Agent]
    P --> Q[Validate Composer]

    Q --> R[Final Combiner]

    R --> S[Sales Email]
    R --> T[Partner Email]
    R --> U[Prospect Email]
    R --> V[Final API Response]

    V --> C
    C --> B
```

### Simplified View

```text
Referral Partner
       ↓
Astoria Referrals
       ↓
Server-side API
       ↓
n8n Workflow
       ↓
Classifier + Extractor
       ↓
Reasoner
       ↓
Composer
       ↓
Final Combiner
       ↓
Result returned to Astoria
```

Supporting systems handle different responsibilities:

```text
Google Sheets → referral log
HubSpot       → prospect CRM record
Gmail         → communication
n8n           → workflow orchestration
Claude        → AI reasoning
Astoria       → user experience
```

---

## 🤖 The AI Agent Team

Instead of giving one large prompt responsibility for the entire referral, I split the work between four agents.

### 1. Classifier

Answers:

> **What kind of referral is this, and how urgent is it?**

Example:

```text
Insurance Line: Auto
Urgency: High
Confidence: 0.90
```

---

### 2. Extractor

Answers:

> **What facts were actually provided?**

It is intentionally not responsible for routing the referral.

For an auto referral, it might extract:

```text
Requested Coverage: Full coverage auto insurance
Vehicle: 2024 Honda Accord
Deadline: Friday
Constraint: Dealership requires proof of insurance
```

When information was not provided, the Extractor is expected to leave it missing instead of inventing it.

---

### 3. Reasoner

Uses the validated Classifier and Extractor outputs to answer:

> **What should happen next?**

It determines:

- Priority
- Routing team
- Response SLA
- Next action
- Whether human review is required

Example:

```text
Priority: High
Route To: Personal Lines
SLA: 4 hours
Human Review: No
```

---

### 4. Composer

Turns the validated decision into communication for:

- Internal sales team
- Referral partner
- Prospect

The Composer does not get to change the routing decision or make new insurance decisions.

---

### Final Combiner

The Combiner brings the outputs together into one structured response.

That response becomes the contract between n8n and the web application.

Example:

```json
{
  "referral_id": "REF-2026-182",
  "processing_status": "ready",
  "final_decision": {
    "insurance_line": "auto",
    "urgency": "high",
    "priority": "high",
    "route_to": "personal_lines",
    "sla_hours": 4,
    "needs_human_review": false
  }
}
```

The frontend does not need the entire internal agent trace to display the result.

It maps the backend response into the information the referral partner actually needs.

---

## 📸 Screenshots

### Referral Intake

![Astoria Referral Form](./docs/screenshots/referral-form.png)

*The partner-facing form used to submit a referral.*

### Automatically Routed Referral

![Successful Referral Result](./docs/screenshots/referral-success.png)

*A clear referral successfully triaged and routed by the workflow.*

### Manual Review

![Manual Review Result](./docs/screenshots/manual-review.png)

*An intentionally vague referral is sent to human review instead of forcing the AI to make a decision.*

### Error Handling

![Invalid Partner Error](./docs/screenshots/invalid-partner.png)

*An invalid partner code is rejected while keeping the information already entered on the form.*

### Mobile Experience

![Astoria Mobile View](./docs/screenshots/mobile-view.jpeg)

*The same referral experience running on a mobile device.*

---

## 🧪 Testing & Guardrails

Before considering the live prototype ready for Demo Day, I ran a production audit across the system.

| Test | Result |
|---|---|
| Live URL | ✅ PASS |
| Happy path | ✅ PASS |
| Manual review | ✅ PASS |
| Invalid partner error | ✅ PASS |
| Mobile usability | ✅ PASS |
| Browser console errors | ✅ PASS |
| Google Sheets logging | ✅ PASS |
| HubSpot CRM | ✅ PASS |
| Email delivery | ✅ PASS |
| Public GitHub | ✅ PASS |
| README accuracy | ✅ PASS |
| Secrets exposed | ✅ NO |

### Happy Path

A clear referral should move through the complete system:

```text
Submit
→ Validate
→ Log
→ Update CRM
→ Run AI team
→ Route
→ Send communication
→ Return result
```

### Manual Review

If the referral is too vague to route confidently, the system can stop and return:

```text
Manual Review Required
Route: General Review
```

instead of pretending to know more than it does.

### Invalid Partner

An unknown partner code is rejected before the referral enters the full workflow.

The user receives a visible error without losing the information they already entered.

### AI Output Validation

Every agent is followed by a validation layer.

If an agent returns:

- Invalid JSON
- Missing output
- An unexpected schema
- An API error

the workflow does not automatically trust it.

A safe fallback can be used and the referral can be escalated for human review.

One of the biggest lessons from building the agent team was:

> **A successful API call does not automatically mean a trustworthy output.**

---

## 🛠️ Technical Stack

### Application

- Lovable
- React 19
- TypeScript
- TanStack Start
- Zod
- Responsive web design

### Workflow

- n8n
- Webhooks
- Structured workflow branching
- Validation and fallback handling

### AI

- Anthropic Claude
- Four-agent orchestration
- Structured JSON outputs

### Integrations

- **HubSpot** — CRM contact creation/update
- **Google Sheets** — referral logging
- **Gmail** — internal, partner, and prospect communication

### Development

- Git
- GitHub
- Runtime environment variables
- Server-side API routes

---

## 💻 Running Locally

Clone the repository:

```bash
git clone <repository-url>
cd referral-partner-app
```

Install dependencies:

```bash
npm install
```

Copy the example environment configuration:

```bash
cp .env.example .env
```

Add the required public project configuration to your local `.env`.

To run the referral flow end-to-end locally, the server also needs access to:

```text
N8N_WEBHOOK_URL
```

This value is private.

It should only exist in your local/server environment and must never be committed to GitHub or exposed through a `VITE_` frontend variable.

Start the development server:

```bash
npm run dev
```

The application will then be available through the local Vite development server.

---

## 📁 Project Structure

```text
referral-partner-app/
│
├── README.md
├── .env.example
├── .gitignore
├── package.json
│
├── public/
│
├── src/
│   ├── components/
│   │
│   ├── integrations/
│   │   └── supabase/
│   │
│   ├── lib/
│   │   ├── referral.functions.ts
│   │   └── ...
│   │
│   ├── routes/
│   │   ├── api/
│   │   │   └── public/
│   │   │       └── submit-referral.ts
│   │   └── index.tsx
│   │
│   └── ...
│
├── supabase/
│   └── config.toml
│
└── docs/
    ├── screenshots/
    │   ├── referral-form.png
    │   ├── referral-success.png
    │   ├── manual-review.png
    │   ├── invalid-partner.png
    │   └── mobile-view.png
    │
    └── TECHNICAL_HANDOFF.md
```

The production n8n workflow and third-party credentials are intentionally not stored in the frontend repository.

---

## 🔐 Security

The production webhook URL is kept behind a server-side boundary.

```text
Browser
   ↓
/api/public/submit-referral
   ↓
N8N_WEBHOOK_URL
```

The browser never receives the n8n webhook URL.

The public GitHub repository also excludes:

```text
.env
.env.*
```

`.env.example` contains only safe example configuration.

Private credentials remain in their respective backend systems.

---

## ⚠️ Known Limitations

This is still a prototype.

### Partner Management

Partner codes are currently predefined in the workflow.

There is no Partner Directory or onboarding interface yet.

The application assumes that a partner has already been onboarded and knows their assigned code.

### Authentication

There is currently no partner login system.

The partner code identifies the referral source, but it is not a complete authentication mechanism.

### Assignment

The workflow currently routes referrals to teams such as:

```text
Personal Lines
Commercial Lines
Life Team
Health Team
General Review
```

It does not assign an individual employee.

### AI Scope

The AI does not:

- Approve insurance coverage
- Determine eligibility
- Set pricing
- Bind policies
- Guarantee certificates
- Replace a licensed professional

Its role is operational triage.

### CRM Scope

HubSpot currently represents the prospect primarily as a CRM contact.

The prototype does not yet contain a complete sales pipeline, deal ownership model, or partner relationship model in HubSpot.

---

## 🚀 Next Steps

At this stage, I am less interested in adding random features and more interested in what would actually make the system usable beyond a prototype.

### 1. Partner Directory

Move partner information out of hardcoded workflow logic and into a real data source.

Example:

| Partner Code | Partner | Email | Status |
|---|---|---|---|
| PARTNER001 | Partner One | partner1@example.com | Active |
| PARTNER002 | Partner Two | partner2@example.com | Active |

n8n could validate the submitted code against this directory.

### 2. Partner Onboarding

Create an internal onboarding flow:

```text
Add Partner
→ Generate Code
→ Store Partner
→ Send Welcome Information
→ Activate Referral Access
```

### 3. Authentication

Allow partners to have accounts rather than relying on a partner code as the primary access mechanism.

### 4. CRM Expansion

Expand HubSpot beyond contact creation/update with:

- Deals
- Referral source
- Pipeline stage
- Referral owner
- Conversion tracking

### 5. Outcome Tracking

The current workflow understands the referral during triage.

A production system should also understand what happened afterward:

```text
Referral Submitted
→ Contacted
→ Quoted
→ Won / Lost
```

### 6. Observability

Add monitoring around:

- Failed workflows
- Agent fallback frequency
- Human-review rate
- API latency
- CRM failures
- Email failures

### 7. Automated Test Coverage

Expand basic application tests into broader frontend, API, and end-to-end coverage.

---

## 💡 What I Learned

One of the biggest lessons from this project was that **building the workflow and understanding the system are not exactly the same thing.**

At first, I was asking:

> Does this node work?

Then:

> Does this API work?

Then:

> Can these agents work together?

Later, the questions became different:

> Who exactly is the partner?

> Where does their partner code come from?

> What does HubSpot represent?

> What happens when there are 100 partners instead of three?

> What should the AI decide, and what should it never decide?

Those questions helped me understand the project as a system instead of only as a collection of working nodes.

Another major lesson was that AI output needs to be treated like any other external input.

The fact that a model responded successfully does not mean that the response is complete, valid, or safe to use.

That is why validation, fallbacks, traceability, and human review became part of the architecture instead of afterthoughts.

---

## 🎓 About This Project

**Project:** Astoria Referrals  
**Author:** Arthur Dorvil  
**Program:** Gayiti Fellowship

The project evolved across the fellowship:

```text
Module 1
Referral Intake Automation
        ↓
Module 2
External APIs + Error Handling
        ↓
Module 3
Four-Agent AI Triage Team
        ↓
Module 4
Live Partner-Facing Web App
        ↓
Module 5
Production Polish + Documentation + Demo Day
```

What started as a webhook and a few emails became a complete referral experience connecting a user-facing application, workflow automation, CRM, communication, and a multi-agent reasoning layer.

More importantly, I now understand much better **why each layer exists, what responsibility it owns, and where the current prototype stops.**

---

## 🎯 Key Takeaway

> **The goal was never to make AI replace the person handling the referral. The goal was to make sure that person starts with better information, clearer routing, and less manual work.**

Astoria Referrals is still a prototype, but it represents the kind of system I want to keep learning how to build:

**practical automation, clear responsibilities, useful AI, and humans still in control.**

---

**Live App:** [astoria-referrals.lovable.app](https://astoria-referrals.lovable.app)

**Built by Arthur Dorvil as part of the Gayiti Fellowship.**
