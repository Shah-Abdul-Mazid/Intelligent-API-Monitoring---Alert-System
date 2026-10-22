import json
import os
from typing import Any, List, Tuple, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.logging import logger
from src.database.connection import get_db
from src.database.models import AnomalyAlert, ApiMetricRecord
from src.schemas.alert import AnomalyAlertResponse, IngestionResult
from src.schemas.telemetry import ApiTelemetryInput, ApiTelemetryResponse
from src.services.ai_service import AIService
from src.services.anomaly_detector import AnomalyDetector
from src.services.email_service import EmailService

router = APIRouter(tags=["Monitoring"])


async def process_single_telemetry(
    item: ApiTelemetryInput,
    db: Session,
) -> Tuple[ApiMetricRecord, Optional[AnomalyAlert]]:
    eval_result = AnomalyDetector.evaluate(item)

    metric_record = ApiMetricRecord(
        api_name=item.api_name,
        endpoint=item.endpoint,
        status_code=item.status_code,
        response_time_ms=item.response_time_ms,
        records_returned=item.records_returned,
        is_anomaly=eval_result.is_anomaly,
        timestamp=item.timestamp,
        raw_payload=item.raw_payload,
    )
    db.add(metric_record)
    db.flush()

    alert_obj = None
    if eval_result.is_anomaly:
        ai_output = await AIService.generate_alert(item, eval_result)

        alert_obj = AnomalyAlert(
            metric_id=metric_record.id,
            api_name=item.api_name,
            endpoint=item.endpoint,
            status_code=item.status_code,
            response_time_ms=item.response_time_ms,
            records_returned=item.records_returned,
            severity=eval_result.severity,
            anomaly_types=eval_result.anomaly_types,
            technical_reasons=eval_result.technical_reasons,
            ai_alert_message=ai_output.get("alert", ""),
            ai_root_cause=ai_output.get("root_cause", ""),
            ai_recommendation=ai_output.get("recommendation", ""),
            ai_engine_used=ai_output.get("engine", "rule-engine"),
            status="ACTIVE",
        )
        db.add(alert_obj)
        db.flush()

        try:
            email_res = EmailService.send_anomaly_alert({
                "api_name": alert_obj.api_name,
                "status_code": alert_obj.status_code,
                "response_time_ms": alert_obj.response_time_ms,
                "records_returned": alert_obj.records_returned,
                "severity": alert_obj.severity,
                "ai_alert_message": alert_obj.ai_alert_message,
                "ai_root_cause": alert_obj.ai_root_cause,
                "ai_recommendation": alert_obj.ai_recommendation,
                "ai_engine_used": alert_obj.ai_engine_used,
            })
            if email_res.get("status") in ["sent", "logged"]:
                alert_obj.email_dispatched = True
        except Exception as e:
            logger.warning(f"Email dispatch error: {e}")

    return metric_record, alert_obj


@router.post("/monitor", response_model=IngestionResult)
async def monitor_telemetry(
    payload: Any = Body(...),
    db: Session = Depends(get_db),
):
    raw_items: List[dict] = []

    if isinstance(payload, list):
        raw_items = payload
    elif isinstance(payload, dict):
        if "records" in payload and isinstance(payload["records"], list):
            raw_items = payload["records"]
        else:
            raw_items = [payload]
    else:
        raise HTTPException(status_code=400, detail="Invalid JSON format. Expected JSON object or array.")

    if not raw_items:
        raise HTTPException(status_code=400, detail="Empty telemetry payload provided.")

    validated_inputs: List[ApiTelemetryInput] = []
    for idx, item in enumerate(raw_items):
        try:
            validated_inputs.append(ApiTelemetryInput(**item))
        except Exception as err:
            logger.error(f"Validation error at item {idx}: {err}")
            raise HTTPException(status_code=422, detail=f"Validation failed for record {idx}: {str(err)}")

    created_alerts = []
    total_processed = len(validated_inputs)

    try:
        for input_item in validated_inputs:
            _, alert = await process_single_telemetry(input_item, db)
            if alert:
                created_alerts.append(alert)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database transaction error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while saving telemetry.")

    return IngestionResult(
        total_processed=total_processed,
        anomalies_detected=len(created_alerts),
        healthy_records=total_processed - len(created_alerts),
        alerts=[AnomalyAlertResponse.model_validate(a) for a in created_alerts],
    )


@router.post("/monitor/load-sample", response_model=IngestionResult)
async def load_sample_file(
    db: Session = Depends(get_db),
):
    candidates = [
        os.path.join(os.getcwd(), "sample_api_responses.json"),
        os.path.join(os.getcwd(), "backend", "sample_api_responses.json"),
        os.path.join(os.path.dirname(__file__), "..", "..", "sample_api_responses.json"),
    ]

    sample_path = None
    for path in candidates:
        if os.path.exists(path):
            sample_path = path
            break

    if not sample_path:
        raise HTTPException(status_code=404, detail="sample_api_responses.json not found.")

    with open(sample_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return await monitor_telemetry(payload=data, db=db)


@router.get("/monitor/records", response_model=List[ApiTelemetryResponse])
def get_telemetry_records(
    limit: int = 50,
    offset: int = 0,
    api_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ApiMetricRecord)
    if api_name:
        query = query.filter(ApiMetricRecord.api_name == api_name)

    records = query.order_by(ApiMetricRecord.id.desc()).offset(offset).limit(limit).all()
    return [ApiTelemetryResponse.model_validate(r) for r in records]
