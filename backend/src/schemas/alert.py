from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class AnomalyAlertResponse(BaseModel):
    id: int
    metric_id: Optional[int] = None
    api_name: str
    endpoint: Optional[str] = None
    status_code: int
    response_time_ms: float
    records_returned: Optional[int] = None
    severity: str
    anomaly_types: List[str]
    technical_reasons: List[str]
    ai_alert_message: str
    ai_root_cause: Optional[str] = None
    ai_recommendation: Optional[str] = None
    ai_engine_used: str
    status: str
    email_dispatched: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SystemStatsResponse(BaseModel):
    total_telemetry_records: int
    total_anomalies: int
    active_anomalies: int
    resolved_anomalies: int
    critical_count: int
    warning_count: int
    anomaly_rate_percentage: float
    system_health_percentage: float
    avg_response_time_ms: float


class IngestionResult(BaseModel):
    total_processed: int
    anomalies_detected: int
    healthy_records: int
    alerts: List[AnomalyAlertResponse]
