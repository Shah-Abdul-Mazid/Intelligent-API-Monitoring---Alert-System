import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let genAIClient = null;

const getGenAIClient = () => {
  if (!genAIClient && config.geminiApiKey) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    } catch (err) {
      logger.warn(`Failed to initialize GoogleGenAI client: ${err.message}`);
    }
  }
  return genAIClient;
};

/**
 * Intelligent Rule-Based Heuristic Fallback
 * Generates human-readable alerts matching the exact prompt specification
 * even if no Gemini API key is configured or network is unavailable.
 */
export const generateHeuristicAlert = (metric, evaluation) => {
  const { api_name, response_time_ms, status_code, records_returned } = metric;
  const { anomalyTypes } = evaluation;

  let alert = '';
  let root_cause = '';
  let recommendation = '';

  const is5xx = status_code >= 500;
  const is4xx = status_code >= 400 && status_code < 500;
  const isHighLatency = response_time_ms >= config.latencyWarningMs;
  const isZeroRecords = records_returned === 0;

  if (is5xx && isZeroRecords) {
    alert = `${api_name} failed with status ${status_code} and returned ${records_returned} records. Possible outage or data issue.`;
    root_cause = `Downstream service crash or internal server exception preventing database query execution in ${api_name}.`;
    recommendation = `Inspect application error logs, verify downstream database connectivity, and restart pods if necessary.`;
  } else if (is5xx) {
    alert = `${api_name} encountered internal error ${status_code} with response time ${response_time_ms}ms. Service instability detected.`;
    root_cause = `Service gateway timeout or unhandled server exception during request processing.`;
    recommendation = `Check gateway error rates, evaluate server CPU/Memory limits, and trace recent deployment changes.`;
  } else if (is4xx) {
    alert = `${api_name} rejected request with client status ${status_code} (${records_returned} records returned). Authentication or bad request issue.`;
    root_cause = `Invalid client credentials, expired OAuth tokens, or malformed request parameters.`;
    recommendation = `Verify API keys/tokens, examine client payload schema, and validate route permissions.`;
  } else if (isHighLatency && isZeroRecords) {
    alert = `${api_name} experienced critical latency (${response_time_ms}ms) and returned 0 records. Data pipeline stall suspected.`;
    root_cause = `Slow query execution hitting database read lock, resulting in empty dataset or worker timeout.`;
    recommendation = `Analyze slow query logs, verify index coverage on patient/appointment tables, and scale worker nodes.`;
  } else if (isHighLatency) {
    alert = `${api_name} responded with high latency (${response_time_ms}ms, status ${status_code}). SLA threshold exceeded.`;
    root_cause = `High network traffic or upstream queue congestion slowing down record retrieval.`;
    recommendation = `Monitor network latency between microservices, review caching layers, and investigate thread pool saturation.`;
  } else if (isZeroRecords) {
    alert = `${api_name} returned status ${status_code} with 0 records. Possible empty result or upstream sync delay.`;
    root_cause = `Data sync pipeline delay, empty database filter match, or partition isolation.`;
    recommendation = `Confirm data ingestion pipeline is active and verify source database has fresh records.`;
  } else {
    alert = `${api_name} telemetry anomaly detected (status ${status_code}, ${response_time_ms}ms, ${records_returned} records).`;
    root_cause = `Anomalous pattern identified in response metrics.`;
    recommendation = `Perform proactive health audit on ${api_name} and review telemetry baselines.`;
  }

  return {
    alert,
    root_cause,
    recommendation,
    model_used: 'heuristic-engine',
  };
};

/**
 * Generate AI-Powered Alert using Google Gemini API or Fallback
 * @param {Object} metric - { api_name, response_time_ms, status_code, records_returned }
 * @param {Object} evaluation - Result from anomaly detector
 * @returns {Promise<Object>} - { alert, root_cause, recommendation, model_used }
 */
export const generateAIAlert = async (metric, evaluation) => {
  const client = getGenAIClient();

  if (!client || !config.geminiApiKey) {
    logger.info(`Using Intelligent Heuristic Alert Engine (No Gemini API key provided)`);
    return generateHeuristicAlert(metric, evaluation);
  }

  const prompt = `
You are an expert Site Reliability Engineer (SRE) monitoring critical healthcare APIs.
An anomalous API telemetry event has been detected:

API Telemetry Data:
- API Name: ${metric.api_name}
- Response Time: ${metric.response_time_ms} ms (Warning threshold: ${config.latencyWarningMs}ms, Critical: ${config.latencyCriticalMs}ms)
- HTTP Status Code: ${metric.status_code}
- Records Returned: ${metric.records_returned}
- Detected Anomaly Types: ${evaluation.anomalyTypes.join(', ')}
- Technical Reasons: ${evaluation.reasons.join('; ')}

Task:
Generate a concise, human-readable alert, root cause diagnosis, and action plan.
Match the tone and format of this example:
"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."

Return ONLY valid JSON matching this exact structure with no extra markdown formatting:
{
  "alert": "Concise human-readable alert message",
  "root_cause": "Probable root cause hypothesis",
  "recommendation": "Immediate actionable recommendation for DevOps/Engineering"
}
`.trim();

  try {
    logger.info(`Calling Gemini API for anomaly alert generation on ${metric.api_name}...`);
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text ? response.text.trim() : '';
    let parsed;
    try {
      // Strip any backticks if returned despite json mode
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      logger.warn(`Could not parse JSON from Gemini response. Raw: ${responseText}`);
      return generateHeuristicAlert(metric, evaluation);
    }

    return {
      alert: parsed.alert || `${metric.api_name} status ${metric.status_code} anomaly detected.`,
      root_cause: parsed.root_cause || evaluation.summary,
      recommendation: parsed.recommendation || 'Investigate server logs and downstream dependencies.',
      model_used: 'gemini-2.5-flash',
    };
  } catch (error) {
    logger.error(`Error calling Gemini API: ${error.message}. Falling back to Heuristic Engine.`);
    return generateHeuristicAlert(metric, evaluation);
  }
};

export default {
  generateAIAlert,
  generateHeuristicAlert,
};
