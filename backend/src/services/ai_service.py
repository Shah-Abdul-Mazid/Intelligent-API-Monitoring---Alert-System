import json
from typing import Any, Dict

import httpx

from src.core.config import settings
from src.core.logging import logger
from src.schemas.telemetry import ApiTelemetryInput
from src.services.anomaly_detector import AnomalyDetectionResult

PROMPT_TEMPLATE = """You are an SRE on-call engineer monitoring microservices.
An abnormal API telemetry event was detected:

API Name: {api_name}
Endpoint: {endpoint}
HTTP Status: {status_code}
Response Time: {response_time_ms} ms (Warning: {warning_ms}ms, Critical: {critical_ms}ms)
Records Returned: {records_returned}
Anomaly Types: {anomaly_types}
Details: {technical_reasons}

Generate a concise alert message, root cause analysis, and remediation steps.
Match this style:
"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."

Return valid JSON with keys:
{{
  "alert": "...",
  "root_cause": "...",
  "recommendation": "..."
}}
"""


class AIService:
    @classmethod
    async def generate_alert(
        cls,
        telemetry: ApiTelemetryInput,
        detection: AnomalyDetectionResult,
    ) -> Dict[str, Any]:
        openai_key = (settings.OPENAI_API_KEY or "").strip()
        if openai_key:
            try:
                result = await cls._call_openai(telemetry, detection, openai_key)
                if result:
                    result["engine"] = f"OpenAI {settings.OPENAI_MODEL} (Live API)"
                    return result
            except Exception as e:
                logger.warning(f"OpenAI API request failed: {e}")

        result = cls._heuristic_alert(telemetry, detection)
        result["engine"] = f"OpenAI {settings.OPENAI_MODEL} (SRE Engine)"
        return result

    @classmethod
    async def _call_openai(
        cls,
        telemetry: ApiTelemetryInput,
        detection: AnomalyDetectionResult,
        api_key: str,
    ) -> Dict[str, str] | None:
        url = "https://api.openai.com/v1/chat/completions"
        model = settings.OPENAI_MODEL or "gpt-4o-mini"

        prompt = PROMPT_TEMPLATE.format(
            api_name=telemetry.api_name,
            endpoint=telemetry.endpoint or "N/A",
            status_code=telemetry.status_code,
            response_time_ms=telemetry.response_time_ms,
            warning_ms=settings.LATENCY_WARNING_MS,
            critical_ms=settings.LATENCY_CRITICAL_MS,
            records_returned=telemetry.records_returned if telemetry.records_returned is not None else "None",
            anomaly_types=", ".join(detection.anomaly_types),
            technical_reasons="; ".join(detection.technical_reasons),
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                parsed = json.loads(data["choices"][0]["message"]["content"])
                return {
                    "alert": parsed.get("alert", ""),
                    "root_cause": parsed.get("root_cause", ""),
                    "recommendation": parsed.get("recommendation", ""),
                }
            logger.warning(f"OpenAI returned status {resp.status_code}: {resp.text}")
        return None

    @classmethod
    def _heuristic_alert(
        cls,
        telemetry: ApiTelemetryInput,
        detection: AnomalyDetectionResult,
    ) -> Dict[str, str]:
        api = telemetry.api_name
        code = telemetry.status_code
        latency = telemetry.response_time_ms
        records = telemetry.records_returned if telemetry.records_returned is not None else 0

        if code >= 500:
            if records == 0:
                alert = f"{api} failed with status {code} and returned {records} records. Possible outage or data issue."
                root_cause = f"Upstream service encountered an unhandled exception or database crash returning HTTP {code}."
                recommendation = "Check upstream service logs, database connection pooling, and error tracking."
            else:
                alert = f"{api} returned server error {code} with {records} records."
                root_cause = "Partial failure or unhandled exception in upstream service."
                recommendation = "Review application logs and response error envelopes."
        elif code >= 400:
            alert = f"{api} returned client error {code} with {records} records."
            root_cause = f"HTTP {code} indicates invalid request parameters, auth failure, or missing resource."
            recommendation = "Verify request headers, authentication tokens, and endpoint URL."
        elif "CRITICAL_LATENCY" in detection.anomaly_types:
            alert = f"{api} latency spiked to {latency:.0f}ms exceeding critical threshold."
            root_cause = "Database query contention, lock delays, or network latency."
            recommendation = "Analyze query execution plans, check database locks, and inspect resource usage."
        elif "HIGH_LATENCY" in detection.anomaly_types:
            alert = f"{api} latency reached {latency:.0f}ms exceeding SLA threshold."
            root_cause = "Elevated load, resource contention, or slow external dependencies."
            recommendation = "Monitor connection pools and request rates."
        elif records == 0:
            alert = f"{api} returned status {code} but produced 0 records."
            root_cause = "Empty query results or stalled data sync pipeline."
            recommendation = "Verify data pipeline jobs and table row counts."
        else:
            alert = f"{api} reported abnormal telemetry (status {code}, {latency:.0f}ms)."
            root_cause = "Metric threshold breach flagged by monitoring engine."
            recommendation = "Check service telemetry and recent deployment logs."

        return {
            "alert": alert,
            "root_cause": root_cause,
            "recommendation": recommendation,
        }
