# Intelligent API Monitoring & Alert System

An automated API monitoring and anomaly detection system with AI-powered, human-readable alert generation, persistent storage, and an interactive real-time dashboard.

---

## Overview

The system ingests API response telemetry from external or internal microservices, evaluates them against health and SLA rules, identifies anomalies (such as high latency, HTTP 5xx/4xx errors, or missing/zero records), and generates concise root-cause alerts using an LLM (with zero-dependency heuristic fallback).

### Key Features
- **Telemetry Ingestion:** Ingest via batch JSON files (`sample_api_responses.json`) or live `POST /monitor` requests.
- **Anomaly Detection:** Multi-factor rule engine evaluating response times, HTTP status codes, and record counts.
- **AI-Powered Alerts:** Generates human-readable alerts and remediation advice via OpenAI LLM (or automatic fallback engine if no key is configured).
- **Persistent Storage:** SQLite database (WAL mode) storing raw telemetry and flagged anomalies.
- **Interactive Dashboard:** Modern web UI to inspect active alerts, view telemetry streams, triage issues, and simulate API traffic.
- **REST Endpoints:** Standardized endpoints (`/monitor`, `/alerts`, `/alerts/stats`, `/health`).

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── api/            # REST API route handlers
│   │   ├── core/           # Configuration and logging
│   │   ├── database/       # SQLAlchemy models and SQLite connection
│   │   ├── schemas/        # Pydantic schemas for request/response validation
│   │   └── services/       # Anomaly detection, AI service, and email service
│   ├── tests/              # Pytest unit and integration tests
│   ├── requirements.txt    # Python dependencies
│   └── run.py              # Application entrypoint
├── frontend/
│   ├── src/                # React dashboard source code
│   ├── dist/               # Pre-built production frontend (served by FastAPI)
│   └── package.json
├── sample_api_responses.json # Sample API dataset
├── AI_Prompts.docx         # AI usage and prompt documentation
└── README.md
```

---

## Quick Start / Setup Instructions

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** *(Only needed if modifying the frontend; the dashboard is already pre-built in `frontend/dist`)*

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Shah-Abdul-Mazid/Intelligent-API-Monitoring---Alert-System.git
cd "Intelligent-API-Monitoring---Alert-System"
```

---

### Step 2: Set Up Backend

Create a Python virtual environment and install dependencies:

**On Windows (PowerShell):**
```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

**On Linux / macOS:**
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

*(Optional)* If you have an OpenAI API key, configure it in `backend/.env`:
```ini
OPENAI_API_KEY=your_api_key_here
```
> **Note:** If no API key is provided, the system automatically uses its built-in intelligent heuristic engine, requiring zero external configuration.

---

### Step 3: Run the Application

The backend server automatically serves both the **REST API** and the **compiled React Dashboard** from a single command:

**On Windows (PowerShell):**
```powershell
$env:PYTHONPATH="backend"
python backend/run.py
```

**On Linux / macOS:**
```bash
PYTHONPATH=backend python backend/run.py
```

---

### Step 4: Access the System

- **Web Dashboard:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## How to Test the System

1. Open **[http://localhost:8000](http://localhost:8000)** in your browser.
2. Click **"Load Sample Data"** in the top navigation.
   - This ingests the test records from `sample_api_responses.json`.
   - The dashboard will immediately display the detected anomalies with AI-generated alerts and root-cause summaries.
3. Click **"Simulate Telemetry"** to manually test custom API responses with high latency or error codes.
4. Switch between the **"Active Alerts"** and **"Telemetry Stream"** tabs to view real-time data.

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/monitor` | Ingest single or batch API telemetry |
| `POST` | `/monitor/load-sample` | Load records from `sample_api_responses.json` |
| `GET` | `/monitor/records` | Fetch ingested telemetry history |
| `GET` | `/alerts` | Fetch active anomalies (`?status=ACTIVE` or `ALL`) |
| `GET` | `/alerts/stats` | Real-time system health score and alert counts |
| `POST` | `/alerts/{id}/resolve` | Mark an anomaly as resolved |
| `POST` | `/alerts/{id}/notify-email` | Dispatch alert notification |
| `DELETE` | `/alerts/clear` | Clear alerts and telemetry history |
| `GET` | `/health` | Service and database health status |

### Example Ingestion Request (`POST /monitor`)

```json
{
  "api_name": "AppointmentAPI",
  "endpoint": "/v1/appointments/today",
  "status_code": 500,
  "response_time_ms": 1420.5,
  "records_returned": 0
}
```

### Example Generated Alert

> **"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."**
> - **Severity:** `CRITICAL`
> - **Root Cause:** Microservice internal server error resulting in empty response payload.
> - **Recommendation:** Inspect upstream application server logs and database connectivity.

---

## Automated Tests

Run the backend test suite:

```powershell
$env:PYTHONPATH="backend"
pytest backend/tests
```

All 9 unit and integration tests validate the anomaly detector rules, schema parsing, and API endpoints.

---

## License

MIT License. Developed for technical assessment evaluation.
