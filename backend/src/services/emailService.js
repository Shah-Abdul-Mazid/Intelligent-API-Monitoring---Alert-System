import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let transporter = null;
let isEthereal = false;

const initTransporter = async () => {
  if (transporter) return transporter;

  if (config.email.host && config.email.user && config.email.pass) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    logger.info(`Email transporter initialized with custom SMTP host: ${config.email.host}`);
  } else {
    // Generate test account with Ethereal for instant preview links
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isEthereal = true;
      logger.info(`Email service initialized with Ethereal Test Account (${testAccount.user})`);
    } catch (err) {
      logger.warn(`Could not create Ethereal test account: ${err.message}`);
      return null;
    }
  }

  return transporter;
};

/**
 * Sends an email notification for a detected anomaly
 * @param {Object} anomaly - Anomaly database record
 * @param {string} recipient - Optional custom recipient email
 * @returns {Promise<Object>} - { success, messageId, previewUrl }
 */
export const sendAnomalyEmail = async (anomaly, recipient = null) => {
  const mailer = await initTransporter();
  if (!mailer) {
    return {
      success: false,
      error: 'Email transporter unavailable',
    };
  }

  const to = recipient || config.email.recipient;
  const severityColor =
    anomaly.severity === 'CRITICAL'
      ? '#ef4444'
      : anomaly.severity === 'WARNING'
      ? '#f59e0b'
      : '#3b82f6';

  const subject = `[${anomaly.severity} ALERT] API Anomaly Detected: ${anomaly.api_name}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: ${severityColor}; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 24px; }
        .alert-box { background: #f1f5f9; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 4px; margin-bottom: 20px; }
        .alert-title { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
        .alert-desc { margin: 0; font-size: 14px; line-height: 1.5; color: #334155; }
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .metric-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
        .section-title { font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px; }
        .section-text { font-size: 14px; color: #334155; line-height: 1.5; margin: 0; background: #f8fafc; padding: 12px; border-radius: 6px; }
        .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Intelligent API Sentinel Alert</h1>
          <p>Severity: ${anomaly.severity} | API: ${anomaly.api_name}</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <div class="alert-title">AI Alert Summary</div>
            <p class="alert-desc">${anomaly.ai_alert_message}</p>
          </div>

          <div class="metrics-grid">
            <div class="metric-item">
              <div class="metric-label">HTTP Status Code</div>
              <div class="metric-value">${anomaly.status_code}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Response Time</div>
              <div class="metric-value">${anomaly.response_time_ms} ms</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Records Returned</div>
              <div class="metric-value">${anomaly.records_returned}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Status</div>
              <div class="metric-value">${anomaly.status}</div>
            </div>
          </div>

          ${
            anomaly.ai_root_cause
              ? `
            <div class="section-title">Probable Root Cause</div>
            <p class="section-text">${anomaly.ai_root_cause}</p>
          `
              : ''
          }

          ${
            anomaly.ai_recommendation
              ? `
            <div class="section-title">Actionable Recommendation</div>
            <p class="section-text">${anomaly.ai_recommendation}</p>
          `
              : ''
          }
        </div>
        <div class="footer">
          Generated automatically by Intelligent API Monitoring & Alert System &bull; ${new Date().toUTCString()}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await mailer.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });

    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;
    logger.info(`Alert email dispatched for Anomaly #${anomaly.id}. MessageId: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`Ethereal email preview available at: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err) {
    logger.error(`Failed to send alert email: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
};

export default {
  sendAnomalyEmail,
};
