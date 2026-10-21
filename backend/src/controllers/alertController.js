import dbService from '../db/database.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

export const getAlerts = async (req, res, next) => {
  try {
    const { status, severity, api_name, limit = 50, offset = 0 } = req.query;

    const anomalies = dbService.getAnomalies({
      status,
      severity,
      api_name,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.status(200).json({
      success: true,
      count: anomalies.length,
      data: anomalies,
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = dbService.getAnomalyById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: `Alert with ID ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAlertStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updated = dbService.updateAnomalyStatus(id, status);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Alert with ID ${id} not found`,
      });
    }

    logger.info(`Alert #${id} status changed to ${status}`);
    return res.status(200).json({
      success: true,
      message: `Alert #${id} updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const sendAlertEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipient } = req.body;

    const anomaly = dbService.getAnomalyById(id);
    if (!anomaly) {
      return res.status(404).json({
        success: false,
        error: `Alert with ID ${id} not found`,
      });
    }

    const mailResult = await emailService.sendAnomalyEmail(anomaly, recipient);
    if (!mailResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to send alert email: ${mailResult.error}`,
      });
    }

    const updated = dbService.markAnomalyEmailSent(id, mailResult.previewUrl);

    return res.status(200).json({
      success: true,
      message: `Alert email dispatched successfully`,
      data: {
        alert: updated,
        previewUrl: mailResult.previewUrl,
        messageId: mailResult.messageId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertStats = async (req, res, next) => {
  try {
    const stats = dbService.getStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const resetData = async (req, res, next) => {
  try {
    dbService.clearAll();
    logger.warn('All telemetry records and anomalies wiped via reset request.');
    return res.status(200).json({
      success: true,
      message: 'Telemetry database reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAlerts,
  getAlertById,
  updateAlertStatus,
  sendAlertEmail,
  getAlertStats,
  resetData,
};
