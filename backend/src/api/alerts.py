from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from src.database.connection import get_db
from src.database.models import AnomalyAlert, ApiMetricRecord
from src.schemas.alert import AnomalyAlertResponse, SystemStatsResponse
from src.services.email_service import EmailService

router = APIRouter(tags=["Alerts"])


@router.get("/alerts", response_model=List[AnomalyAlertResponse])
def get_alerts(
    status: Optional[str] = Query("ACTIVE"),
    severity: Optional[str] = Query(None),
    api_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(AnomalyAlert)

    if status and status.upper() != "ALL":
        query = query.filter(AnomalyAlert.status == status.upper())

    if severity:
        query = query.filter(AnomalyAlert.severity == severity.upper())

    if api_name:
        query = query.filter(AnomalyAlert.api_name == api_name)

    alerts = query.order_by(AnomalyAlert.created_at.desc()).offset(offset).limit(limit).all()
    return [AnomalyAlertResponse.model_validate(a) for a in alerts]


@router.get("/alerts/stats", response_model=SystemStatsResponse)
def get_system_stats(
    db: Session = Depends(get_db),
):
    total_records = db.query(func.count(ApiMetricRecord.id)).scalar() or 0
    total_anomalies = db.query(func.count(AnomalyAlert.id)).scalar() or 0
    active_anomalies = db.query(func.count(AnomalyAlert.id)).filter(AnomalyAlert.status == "ACTIVE").scalar() or 0
    resolved_anomalies = db.query(func.count(AnomalyAlert.id)).filter(AnomalyAlert.status == "RESOLVED").scalar() or 0
    critical_count = db.query(func.count(AnomalyAlert.id)).filter(
        AnomalyAlert.status == "ACTIVE",
        AnomalyAlert.severity == "CRITICAL",
    ).scalar() or 0
    warning_count = db.query(func.count(AnomalyAlert.id)).filter(
        AnomalyAlert.status == "ACTIVE",
        AnomalyAlert.severity == "WARNING",
    ).scalar() or 0

    avg_resp = db.query(func.avg(ApiMetricRecord.response_time_ms)).scalar() or 0.0

    anomaly_rate = (total_anomalies / total_records * 100.0) if total_records > 0 else 0.0
    health_score = max(0.0, 100.0 - anomaly_rate)

    return SystemStatsResponse(
        total_telemetry_records=total_records,
        total_anomalies=total_anomalies,
        active_anomalies=active_anomalies,
        resolved_anomalies=resolved_anomalies,
        critical_count=critical_count,
        warning_count=warning_count,
        anomaly_rate_percentage=round(anomaly_rate, 2),
        system_health_percentage=round(health_score, 2),
        avg_response_time_ms=round(avg_resp, 2),
    )


@router.post("/alerts/{alert_id}/resolve", response_model=AnomalyAlertResponse)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
):
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return AnomalyAlertResponse.model_validate(alert)


@router.post("/alerts/{alert_id}/notify-email")
def dispatch_email_for_alert(
    alert_id: int,
    db: Session = Depends(get_db),
):
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    res = EmailService.send_anomaly_alert({
        "api_name": alert.api_name,
        "status_code": alert.status_code,
        "response_time_ms": alert.response_time_ms,
        "records_returned": alert.records_returned,
        "severity": alert.severity,
        "ai_alert_message": alert.ai_alert_message,
        "ai_root_cause": alert.ai_root_cause,
        "ai_recommendation": alert.ai_recommendation,
        "ai_engine_used": alert.ai_engine_used,
    })

    alert.email_dispatched = True
    db.commit()
    return res


@router.delete("/alerts/clear")
def clear_all_data(
    db: Session = Depends(get_db),
):
    db.query(AnomalyAlert).delete()
    db.query(ApiMetricRecord).delete()
    db.commit()
    return {"message": "All monitoring data and alerts cleared."}
