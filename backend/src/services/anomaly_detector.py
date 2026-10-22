from typing import List
from src.core.config import settings
from src.schemas.telemetry import ApiTelemetryInput


class AnomalyDetectionResult:
    def __init__(
        self,
        is_anomaly: bool,
        severity: str,
        anomaly_types: List[str],
        technical_reasons: List[str],
    ):
        self.is_anomaly = is_anomaly
        self.severity = severity
        self.anomaly_types = anomaly_types
        self.technical_reasons = technical_reasons


class AnomalyDetector:
    @staticmethod
    def evaluate(telemetry: ApiTelemetryInput) -> AnomalyDetectionResult:
        anomaly_types: List[str] = []
        technical_reasons: List[str] = []
        is_critical = False

        status = telemetry.status_code
        latency = telemetry.response_time_ms
        records = telemetry.records_returned

        if status >= 500:
            anomaly_types.append("HTTP_5XX_SERVER_ERROR")
            technical_reasons.append(f"HTTP status {status} indicates internal server or gateway error.")
            is_critical = True
        elif status >= 400:
            anomaly_types.append("HTTP_4XX_CLIENT_ERROR")
            technical_reasons.append(f"HTTP status {status} indicates client request or auth failure.")

        if latency >= settings.LATENCY_CRITICAL_MS:
            anomaly_types.append("CRITICAL_LATENCY")
            technical_reasons.append(f"Latency of {latency:.1f}ms exceeds critical threshold of {settings.LATENCY_CRITICAL_MS}ms.")
            is_critical = True
        elif latency >= settings.LATENCY_WARNING_MS:
            anomaly_types.append("HIGH_LATENCY")
            technical_reasons.append(f"Latency of {latency:.1f}ms exceeds warning threshold of {settings.LATENCY_WARNING_MS}ms.")

        if records is not None:
            if records < 0:
                anomaly_types.append("INVALID_DATA")
                technical_reasons.append(f"Negative record count: {records}.")
            elif records == 0:
                anomaly_types.append("ZERO_RECORDS")
                if status >= 400:
                    technical_reasons.append("Zero records returned during HTTP error.")
                    is_critical = True
                else:
                    technical_reasons.append("Zero records returned for endpoint query.")
        else:
            anomaly_types.append("MISSING_RECORDS_FIELD")
            technical_reasons.append("Missing records_returned in payload.")

        is_anomaly = len(anomaly_types) > 0
        severity = "CRITICAL" if is_critical else ("WARNING" if is_anomaly else "INFO")

        return AnomalyDetectionResult(
            is_anomaly=is_anomaly,
            severity=severity,
            anomaly_types=anomaly_types,
            technical_reasons=technical_reasons,
        )
