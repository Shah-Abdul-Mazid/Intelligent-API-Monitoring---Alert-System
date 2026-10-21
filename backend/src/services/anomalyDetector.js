import config from '../config/index.js';

export const AnomalyType = {
  HTTP_5XX: 'HTTP_5XX_SERVER_ERROR',
  HTTP_4XX: 'HTTP_4XX_CLIENT_ERROR',
  CRITICAL_LATENCY: 'CRITICAL_LATENCY',
  HIGH_LATENCY: 'HIGH_LATENCY',
  ZERO_RECORDS: 'ZERO_RECORDS',
  INVALID_DATA: 'INVALID_DATA',
};

export const Severity = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

/**
 * Evaluates an API monitoring metric and detects anomalies.
 * @param {Object} input - { api_name, response_time_ms, status_code, records_returned }
 * @returns {Object} - { isAnomaly, severity, anomalyTypes, details }
 */
export const evaluateMetrics = (input) => {
  const {
    api_name = 'UnknownAPI',
    response_time_ms,
    status_code,
    records_returned,
  } = input;

  const anomalyTypes = [];
  const reasons = [];

  // 1. Status Code Analysis
  const is5xx = status_code >= 500 && status_code <= 599;
  const is4xx = status_code >= 400 && status_code <= 499;

  if (is5xx) {
    anomalyTypes.push(AnomalyType.HTTP_5XX);
    reasons.push(`Server returned critical failure status code ${status_code}`);
  } else if (is4xx) {
    anomalyTypes.push(AnomalyType.HTTP_4XX);
    reasons.push(`Client or authorization error status code ${status_code}`);
  }

  // 2. Response Time / Latency Analysis
  const isCriticalLatency = response_time_ms >= config.latencyCriticalMs;
  const isHighLatency = response_time_ms >= config.latencyWarningMs && !isCriticalLatency;

  if (isCriticalLatency) {
    anomalyTypes.push(AnomalyType.CRITICAL_LATENCY);
    reasons.push(`Latency ${response_time_ms}ms exceeds critical threshold of ${config.latencyCriticalMs}ms`);
  } else if (isHighLatency) {
    anomalyTypes.push(AnomalyType.HIGH_LATENCY);
    reasons.push(`Latency ${response_time_ms}ms exceeds warning threshold of ${config.latencyWarningMs}ms`);
  }

  // 3. Data Integrity & Record Count Analysis
  const isZeroRecords = records_returned === 0;
  const isInvalidData = records_returned === undefined || records_returned === null || records_returned < 0;

  if (isInvalidData) {
    anomalyTypes.push(AnomalyType.INVALID_DATA);
    reasons.push(`Invalid records count: ${records_returned}`);
  } else if (isZeroRecords) {
    anomalyTypes.push(AnomalyType.ZERO_RECORDS);
    reasons.push(`Zero records returned`);
  }

  const isAnomaly = anomalyTypes.length > 0;

  // 4. Determine Composite Severity
  let severity = Severity.INFO;

  if (is5xx || isCriticalLatency || (is4xx && isZeroRecords)) {
    severity = Severity.CRITICAL;
  } else if (is4xx || isHighLatency || isZeroRecords || isInvalidData) {
    severity = Severity.WARNING;
  } else if (isAnomaly) {
    severity = Severity.INFO;
  }

  return {
    isAnomaly,
    severity,
    anomalyTypes,
    reasons,
    summary: reasons.join('; '),
  };
};

export default {
  evaluateMetrics,
  AnomalyType,
  Severity,
};
