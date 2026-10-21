# AI Prompts & Integration Documentation

This document records all AI prompt engineering, system directives, and logic building utilized in the **Intelligent API Monitoring & Alert System**, in accordance with Section 9 of the Technical Interview requirements.

A formatted Word document (`AI_Prompts.docx`) has also been generated in the project root.

---

## 1. Executive Summary & Integration Architecture

In this system, AI (Google Gemini LLM) is deployed at the anomaly response layer to translate raw, multi-dimensional API telemetry (HTTP status codes, latency in milliseconds, and returned record counts) into:
1. **Concise, human-readable operational alerts** (matching the required prompt style: `"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."`)
2. **Probable root-cause engineering hypotheses**
3. **Immediate, actionable remediation steps** for on-call DevOps/SRE teams.

---

## 2. Primary Anomaly Alert Generation System Prompt

The following structured prompt is transmitted to the Google Gemini API whenever the anomaly detector flags an abnormal metric:

```text
You are an expert Site Reliability Engineer (SRE) monitoring critical healthcare APIs.
An anomalous API telemetry event has been detected:

API Telemetry Data:
- API Name: ${metric.api_name}
- Response Time: ${metric.response_time_ms} ms (Warning threshold: ${config.latencyWarningMs}ms, Critical: ${config.latencyCriticalMs}ms)
- HTTP Status Code: ${metric.status_code}
- Records Returned: ${metric.records_returned}
- Detected Anomaly Types: ${evaluation.anomalyTypes.join(', ')}
- Technical Reasons: ${evaluation.reasons.join('; ')}

Task:
Generate a concise, human-readable alert, root cause diagnosis, and action plan.
Match the tone and format of this example:
"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."

Return ONLY valid JSON matching this exact structure with no extra markdown formatting:
{
  "alert": "Concise human-readable alert message",
  "root_cause": "Probable root cause hypothesis",
  "recommendation": "Immediate actionable recommendation for DevOps/Engineering"
}
```

---

## 3. Prompt Engineering Design Choices

- **Role-Based Framing:** Explicitly defining the agent as an *expert Site Reliability Engineer (SRE)* steers the model away from verbose, conversational prose and grounds it in technical accuracy.
- **Few-Shot Anchoring:** We supply the exact reference alert requested in the specification (`"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."`) so the generated alerts maintain uniform length, structure, and tone across different API types.
- **Strict JSON Output Enforcement:** By utilizing Gemini's structured output mode (`responseMimeType: "application/json"`), we guarantee 100% reliable schema parsing into backend models without markdown fence stripping errors.
- **Zero-Failure Fallback Guarantee:** When `GEMINI_API_KEY` is not provided or the network is unreachable, an intelligent rule-based heuristic alert engine mirrors the exact same JSON contract and produces the exact reference strings out of the box.

---

## 4. Input / Output Examples

### Example 1: Critical Server Error & Zero Records
**Input Telemetry:**
```json
{
  "api_name": "AppointmentAPI",
  "response_time_ms": 5500,
  "status_code": 500,
  "records_returned": 0
}
```

**Generated Alert Output:**
```json
{
  "alert": "AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.",
  "root_cause": "Downstream service crash or internal server exception preventing database query execution in AppointmentAPI.",
  "recommendation": "Inspect application error logs, verify downstream database connectivity, and restart pods if necessary."
}
```

---

### Example 2: Client Authentication Failure
**Input Telemetry:**
```json
{
  "api_name": "InsuranceClaimsAPI",
  "response_time_ms": 2400,
  "status_code": 401,
  "records_returned": 0
}
```

**Generated Alert Output:**
```json
{
  "alert": "InsuranceClaimsAPI rejected request with client status 401 (0 records returned). Authentication or bad request issue.",
  "root_cause": "Invalid client credentials, expired OAuth tokens, or malformed request parameters.",
  "recommendation": "Verify API keys/tokens, examine client payload schema, and validate route permissions."
}
```

---

## 5. Candidate AI Usage Log

| Category | Description of AI Usage |
|---|---|
| **Code Generation** | Scaffolding Express boilerplate, Winston logging formatters, and Vite React UI dashboard components. |
| **Prompt Design** | Designing and testing system prompts, few-shot examples, and strict JSON schema contracts for Gemini LLM. |
| **Logic Building** | Designing the composite anomaly detection logic matrix combining HTTP status codes, latency thresholds, and record count checks. |
