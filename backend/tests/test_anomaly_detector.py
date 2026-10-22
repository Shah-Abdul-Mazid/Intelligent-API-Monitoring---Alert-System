from src.schemas.telemetry import ApiTelemetryInput
from src.services.anomaly_detector import AnomalyDetector


def test_server_error_and_zero_records():
    item = ApiTelemetryInput(
        api_name="AppointmentAPI",
        status_code=500,
        response_time_ms=1420.0,
        records_returned=0,
    )
    result = AnomalyDetector.evaluate(item)

    assert result.is_anomaly is True
    assert result.severity == "CRITICAL"
    assert "HTTP_5XX_SERVER_ERROR" in result.anomaly_types
    assert "ZERO_RECORDS" in result.anomaly_types


def test_critical_latency_spike():
    item = ApiTelemetryInput(
        api_name="PatientDataAPI",
        status_code=200,
        response_time_ms=4520.0,
        records_returned=100,
    )
    result = AnomalyDetector.evaluate(item)

    assert result.is_anomaly is True
    assert result.severity == "CRITICAL"
    assert "CRITICAL_LATENCY" in result.anomaly_types


def test_warning_latency_spike():
    item = ApiTelemetryInput(
        api_name="LabResultsAPI",
        status_code=200,
        response_time_ms=2500.0,
        records_returned=10,
    )
    result = AnomalyDetector.evaluate(item)

    assert result.is_anomaly is True
    assert result.severity == "WARNING"
    assert "HIGH_LATENCY" in result.anomaly_types


def test_client_error():
    item = ApiTelemetryInput(
        api_name="InsuranceVerificationAPI",
        status_code=401,
        response_time_ms=320.0,
        records_returned=0,
    )
    result = AnomalyDetector.evaluate(item)

    assert result.is_anomaly is True
    assert "HTTP_4XX_CLIENT_ERROR" in result.anomaly_types


def test_healthy_telemetry():
    item = ApiTelemetryInput(
        api_name="BillingAPI",
        status_code=200,
        response_time_ms=180.0,
        records_returned=50,
    )
    result = AnomalyDetector.evaluate(item)

    assert result.is_anomaly is False
    assert result.severity == "INFO"
    assert len(result.anomaly_types) == 0
