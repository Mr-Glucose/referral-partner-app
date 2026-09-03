# Referral Partner App

This is the referral workflow I’ve been building throughout the Gayiti fellowship, starting from a simple intake automation and gradually turning it into a real app.

The idea is simple: a referral partner submits a prospect, the system processes the referral, and an AI agent team helps determine what kind of referral it is, how urgent it is, where it should go, and what should happen next.

I wanted the final version to be something a nontechnical person could actually use, not just an n8n workflow running in the background.

## How It Works

A partner submits:

- Partner code
- Prospect name
- Prospect email
- Insurance intent
- Optional referral notes

The frontend sends the referral to a server-side API endpoint.

That backend endpoint securely forwards the referral to my n8n workflow. The n8n webhook URL stays on the server and is never exposed to the browser.

Inside n8n, four AI agents handle different parts of the referral:

- **Classifier** — identifies the insurance line and urgency
- **Extractor** — pulls out facts that were actually provided
- **Reasoner** — determines priority, routing, SLA, and the next action
- **Composer** — prepares the sales summary and partner/prospect communication

Each agent output is validated before the workflow continues.

The results are combined into one final response, returned through the backend, and displayed in the app.

The app shows whether the referral:

- Is ready to move forward
- Needs human review
- Could not be submitted

## Tech Stack

- Lovable
- React / TypeScript
- Server-side API endpoint
- n8n
- Claude
- HubSpot
- Gmail
- Google Sheets

## Running Locally

Install the dependencies:

```bash
npm install
npm run dev
