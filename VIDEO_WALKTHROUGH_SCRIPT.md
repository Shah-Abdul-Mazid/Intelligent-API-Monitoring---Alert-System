# Video Explanation Script (5–10 Minutes)
## Intelligent API Monitoring & Alert System

This script provides a structured, minute-by-minute guide for recording the 5–10 minute architectural and workflow walkthrough required by the technical interview.

---

### Video Metadata & Quick Reference
- **Target Duration:** 6 to 8 minutes (Well within the 5–10 minute limit)
- **Screen Layout:** 
  - Dual pane or fullscreen browser showing the React Dashboard (`http://localhost:5000`)
  - VS Code open to the codebase (showing `backend/src` and `AI_Prompts.md`)
  - Terminal open showing server logs or test execution

---

## Timeline & Scene-by-Scene Script

### Scene 1: Introduction & Objective (0:00 – 1:00)
- **Visual:** Fullscreen on the browser dashboard at `http://localhost:5000`.
- **Audio / Talking Points:**
  > *"Hello everyone! Today, I am presenting the Intelligent API Monitoring & Alert System. In modern healthcare environments, our platform integrates with external microservices such as PatientDataAPI, AppointmentAPI, and BillingAPI.*
  >
  > *In production, external APIs may fail intermittently, return 500 errors, experience severe latency spikes, or silently return zero records. The goal of this system is to proactively detect these anomalies in real-time, store them reliably, and use an AI Large Language Model to translate raw technical metrics into concise, human-readable operational alerts with root-cause diagnoses and actionable remediation steps."*

---

### Scene 2: High-Level Architecture & Key Decisions (1:00 – 2:30)
- **Visual:** Switch briefly to the architecture diagram in the `README.md` or show the modular file structure in VS Code (`src/routes`, `src/services`, `src/controllers`, `src/db`).
- **Audio / Talking Points:**
  > *"Let's take a look at the system architecture and key design decisions:*
  >
  > *1. **Modular Backend:** Built with Node.js and Express. It follows a clean separation of concerns: routes, validation middleware with Zod, controllers, business services, and a dedicated database repository layer.*
  >
  > *2. **Dual Input Capabilities:** The system ingests telemetry either from static JSON files or via real-time HTTP POST requests to `/monitor`, supporting both single records and batch arrays.*
  >
  > *3. **Persistent Data Storage:** We use SQLite with Write-Ahead Logging (WAL mode) via better-sqlite3. This ensures ACID compliance and zero external setup—the database initializes automatically upon launch with indexed tables for raw telemetry and anomalies.*
  >
  > *4. **Dual AI Alert Engine:** We integrated Google Gemini 2.5 Flash. To ensure enterprise resilience, the system also features an intelligent heuristic fallback. If external AI API keys or quotas are absent, the system generates the exact required alert format without failing."*

---

### Scene 3: Ingestion & Anomaly Detection Workflow (2:30 – 4:15)
- **Visual:** Switch to browser dashboard. Click the button **"Ingest Static Sample Batch"**.
- **Audio / Talking Points:**
  > *"Let's see the system in action. I will click 'Ingest Static Sample Batch'. This loads our static dataset containing telemetry for PatientDataAPI, AppointmentAPI, BillingAPI, and EHRSyncAPI.*
  >
  > *Notice how instantly the dashboard updates:*
  > *- **PatientDataAPI** responded in 1200ms with status 200 and 50 records. The rule engine classified it as completely HEALTHY.*
  > *- In contrast, **AppointmentAPI** returned status 500 in 5500ms with 0 records.*
  >
  > *The anomaly detector flagged this as a CRITICAL severity failure, combining HTTP 5xx error, latency threshold breach, and zero records returned."*

---

### Scene 4: AI Alert Generation & Prompt Engineering (4:15 – 5:45)
- **Visual:** Point mouse cursor at the AI Alert card for `AppointmentAPI`. Click **"View Root Cause & Steps"** to reveal the collapsible section.
- **Audio / Talking Points:**
  > *"Here is the AI-powered alert generated for AppointmentAPI:*
  >
  > *`'AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.'`*
  >
  > *This matches the assignment's exact specification. Notice that the AI doesn't stop at a one-line alert—it also provides:*
  > *- **Probable Root Cause:** Downstream service crash or internal server exception preventing database query execution.*
  > *- **Actionable Recommendation:** Inspect application error logs, verify downstream database connectivity, and restart pods if necessary.*
  >
  > *In the project root, you can find `AI_Prompts.docx` and `AI_Prompts.md`, documenting the system prompt, few-shot examples, and strict JSON output schemas."*

---

### Scene 5: Live Triage & Email Notification (5:45 – 7:00)
- **Visual:** On the `AppointmentAPI` card, click **"Dispatch Email Report"**. When the modal appears, click **"Open Email in Browser"**.
- **Audio / Talking Points:**
  > *"The system includes full triage management and an optional email alert feature:*
  >
  > *When I click 'Dispatch Email Report', the backend constructs a branded HTML alert email and dispatches it via Nodemailer.*
  >
  > *Because we use Ethereal email fallback, it instantly generates a live web preview link. Clicking it opens the exact HTML email that on-call engineers receive, including the severity badge, AI alert summary, telemetry grid, and root-cause analysis.*
  >
  > *Back on the dashboard, we can update the alert status from ACTIVE to RESOLVED with one click, updating our active anomaly counts in real-time."*

---

### Scene 6: Telemetry Ingestion Simulator & Raw Stream (7:00 – 8:15)
- **Visual:** Switch to the **"Telemetry Ingestion Simulator"** tab. Select a preset (e.g., BillingAPI SLA breach or custom values) and click **"Submit to POST /monitor"**. Then click the **"Raw Telemetry Stream"** tab.
- **Audio / Talking Points:**
  > *"To test custom scenarios, we built the Telemetry Ingestion Simulator.*
  >
  > *Here, developers or QA engineers can select preset scenarios or enter arbitrary response times, status codes, and record counts.*
  >
  > *Submitting this form triggers a live HTTP POST to `/monitor`. On the right, you can see the immediate JSON response returned by the backend, including anomaly classification and AI reasoning.*
  >
  > *Under the 'Raw Telemetry Stream' tab, we have full visibility into every single request ingested by the system, ensuring complete auditability."*

---

### Scene 7: Conclusion & Wrap-Up (8:15 – 9:00)
- **Visual:** Return to the main dashboard or terminal showing `npm test` passing.
- **Audio / Talking Points:**
  > *"To summarize:*
  > *- We built a clean, modular backend in Express and Node.js.*
  > *- We implemented robust multi-factor anomaly detection across response time, status codes, and record counts.*
  > *- We integrated Gemini LLM with an intelligent fallback to produce human-readable alerts.*
  > *- We stored everything persistently in SQLite with WAL mode.*
  > *- We provided a comprehensive, modern React dashboard, email notifications, and automated test coverage.*
  >
  > *Thank you very much for your time, and I look forward to your questions during the interview!"*
