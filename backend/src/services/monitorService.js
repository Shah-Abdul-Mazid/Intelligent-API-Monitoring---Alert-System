import fs from 'fs';
import dbService from '../db/database.js';
import anomalyDetector from './anomalyDetector.js';
import aiService from './aiService.js';
import emailService from './emailService.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Process a single API telemetry metric
 */
export const processSingleMetric = async (metric) => {
  const normalized = {
    api_name: String(metric.api_name || 'UnknownAPI').trim(),
    response_time_ms: Math.max(0, parseInt(metric.response_time_ms, 10) || 0),
    status_code: parseInt(metric.status_code, 10) || 200,
    records_returned: metric.records_returned === undefined ? 0 : parseInt(metric.records_returned, 10),
    payload_meta: metric.payload_meta || null,
  };

  // 1. Detect anomalies
  const evaluation = anomalyDetector.evaluateMetrics(normalized);

  // 2. Insert raw record into database
  const recordId = dbService.insertRecord({
    ...normalized,
    is_anomaly: evaluation.isAnomaly,
  });

  let anomalyRecord = null;

  // 3. If anomaly detected, generate AI alert & store
  if (evaluation.isAnomaly) {
    logger.warn(`Anomaly detected for ${normalized.api_name}: ${evaluation.summary}`);

    const aiResult = await aiService.generateAIAlert(normalized, evaluation);

    anomalyRecord = dbService.insertAnomaly({
      record_id: recordId,
      api_name: normalized.api_name,
      response_time_ms: normalized.response_time_ms,
      status_code: normalized.status_code,
      records_returned: normalized.records_returned,
      anomaly_types: evaluation.anomalyTypes,
      severity: evaluation.severity,
      ai_alert_message: aiResult.alert,
      ai_root_cause: aiResult.root_cause,
      ai_recommendation: aiResult.recommendation,
      status: 'ACTIVE',
    });

    // 4. Auto-email if critical and configured
    if (config.email.autoSendOnCritical && evaluation.severity === 'CRITICAL') {
      try {
        const mailRes = await emailService.sendAnomalyEmail(anomalyRecord);
        if (mailRes.success) {
          anomalyRecord = dbService.markAnomalyEmailSent(anomalyRecord.id, mailRes.previewUrl);
        }
      } catch (mailErr) {
        logger.error(`Auto-email dispatch failed: ${mailErr.message}`);
      }
    }
  } else {
    logger.debug(`API metric healthy for ${normalized.api_name} (${normalized.response_time_ms}ms, status ${normalized.status_code})`);
  }

  return {
    recordId,
    metric: normalized,
    evaluation,
    anomaly: anomalyRecord,
  };
};

/**
 * Process batch of API telemetry metrics
 */
export const processBatchMetrics = async (metricsArray) => {
  if (!Array.isArray(metricsArray)) {
    throw new Error('Batch payload must be an array of metrics');
  }

  logger.info(`Processing batch of ${metricsArray.length} API metrics`);
  const results = [];
  let anomaliesCount = 0;

  for (const item of metricsArray) {
    try {
      const result = await processSingleMetric(item);
      results.push(result);
      if (result.evaluation.isAnomaly) {
        anomaliesCount++;
      }
    } catch (err) {
      logger.error(`Failed to process item ${JSON.stringify(item)}: ${err.message}`);
      results.push({
        metric: item,
        error: err.message,
      });
    }
  }

  return {
    totalProcessed: metricsArray.length,
    anomaliesDetected: anomaliesCount,
    healthyCount: metricsArray.length - anomaliesCount,
    details: results,
  };
};

/**
 * Load and process a static JSON file
 */
export const processStaticJsonFile = async (filePath = null) => {
  const targetPath = filePath || config.sampleDataPath;
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Static JSON file not found at: ${targetPath}`);
  }

  const raw = fs.readFileSync(targetPath, 'utf-8');
  const parsed = JSON.parse(raw);

  const dataArray = Array.isArray(parsed) ? parsed : [parsed];
  logger.info(`Loaded ${dataArray.length} items from static JSON file: ${targetPath}`);

  return processBatchMetrics(dataArray);
};

export default {
  processSingleMetric,
  processBatchMetrics,
  processStaticJsonFile,
};
