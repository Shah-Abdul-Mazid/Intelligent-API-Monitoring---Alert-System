from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ApiTelemetryInput(BaseModel):
    api_name: str
    endpoint: Optional[str] = None
    status_code: int
    response_time_ms: float
    records_returned: Optional[int] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    raw_payload: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "apiName" in data and "api_name" not in data:
                data["api_name"] = data["apiName"]
            if "name" in data and "api_name" not in data:
                data["api_name"] = data["name"]
            if "statusCode" in data and "status_code" not in data:
                data["status_code"] = data["statusCode"]
            if "status" in data and "status_code" not in data and isinstance(data["status"], int):
                data["status_code"] = data["status"]
            if "responseTime" in data and "response_time_ms" not in data:
                data["response_time_ms"] = data["responseTime"]
            if "response_time" in data and "response_time_ms" not in data:
                data["response_time_ms"] = data["response_time"]
            if "latency" in data and "response_time_ms" not in data:
                data["response_time_ms"] = data["latency"]
            if "recordsReturned" in data and "records_returned" not in data:
                data["records_returned"] = data["recordsReturned"]
            if "records" in data and "records_returned" not in data and isinstance(data["records"], int):
                data["records_returned"] = data["records"]
            if "record_count" in data and "records_returned" not in data:
                data["records_returned"] = data["record_count"]
        return data


class ApiTelemetryResponse(BaseModel):
    id: int
    api_name: str
    endpoint: Optional[str]
    status_code: int
    response_time_ms: float
    records_returned: Optional[int]
    is_anomaly: bool
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchTelemetryPayload(BaseModel):
    records: List[ApiTelemetryInput]
