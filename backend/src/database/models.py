import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class ApiMetricRecord(Base):
    __tablename__ = "api_metric_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    api_name = Column(String(100), index=True, nullable=False)
    endpoint = Column(String(255), nullable=True)
    status_code = Column(Integer, index=True, nullable=False)
    response_time_ms = Column(Float, nullable=False)
    records_returned = Column(Integer, nullable=True)
    is_anomaly = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    raw_payload = Column(Text, nullable=True)

    # Relationships
    alerts = relationship(
        "AnomalyAlert", back_populates="metric", cascade="all, delete-orphan"
    )


class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    metric_id = Column(Integer, ForeignKey("api_metric_records.id"), nullable=True)
    api_name = Column(String(100), index=True, nullable=False)
    endpoint = Column(String(255), nullable=True)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Float, nullable=False)
    records_returned = Column(Integer, nullable=True)

    severity = Column(String(20), default="WARNING", index=True)
    anomaly_types = Column(JSON, nullable=False)
    technical_reasons = Column(JSON, nullable=False)

    ai_alert_message = Column(Text, nullable=False)
    ai_root_cause = Column(Text, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    ai_engine_used = Column(String(50), default="heuristic")

    status = Column(String(20), default="ACTIVE", index=True)
    email_dispatched = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    metric = relationship("ApiMetricRecord", back_populates="alerts")
