import pytest
from fastapi.testclient import TestClient
from src.app import app
from src.database.connection import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_monitor_single_anomaly_and_alert_generation():
    payload = {
        "api_name": "AppointmentAPI",
        "endpoint": "/v1/appointments/today",
        "status_code": 500,
        "response_time_ms": 1420.5,
        "records_returned": 0,
    }
    resp = client.post("/monitor", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_processed"] == 1
    assert data["anomalies_detected"] == 1
    assert len(data["alerts"]) == 1

    alert = data["alerts"][0]
    assert alert["api_name"] == "AppointmentAPI"
    assert alert["severity"] == "CRITICAL"
    assert "AppointmentAPI" in alert["ai_alert_message"]
    assert "status 500" in alert["ai_alert_message"]


def test_alerts_endpoint_and_filtering():
    # Fetch active alerts
    resp = client.get("/alerts?status=ACTIVE")
    assert resp.status_code == 200
    alerts = resp.json()
    assert isinstance(alerts, list)
    assert len(alerts) >= 1

    # Fetch stats
    stats_resp = client.get("/alerts/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_telemetry_records"] >= 1
    assert stats["active_anomalies"] >= 1


def test_resolve_alert():
    # Fetch one alert
    resp = client.get("/alerts?status=ACTIVE")
    alerts = resp.json()
    assert len(alerts) > 0
    alert_id = alerts[0]["id"]

    # Resolve it
    resolve_resp = client.post(f"/alerts/{alert_id}/resolve")
    assert resolve_resp.status_code == 200
    resolved_data = resolve_resp.json()
    assert resolved_data["status"] == "RESOLVED"
    assert resolved_data["resolved_at"] is not None
