import monitorService from '../services/monitorService.js';
import dbService from '../db/database.js';
import logger from '../utils/logger.js';

export const handleMonitor = async (req, res, next) => {
  try {
    const data = req.validatedData || req.body;

    if (Array.isArray(data)) {
      const result = await monitorService.processBatchMetrics(data);
      return res.status(200).json({
        success: true,
        message: `Processed batch of ${result.totalProcessed} API metrics`,
        data: result,
      });
    }

    const result = await monitorService.processSingleMetric(data);
    return res.status(200).json({
      success: true,
      message: result.evaluation.isAnomaly
        ? `Anomaly detected for ${result.metric.api_name}`
        : `Metric recorded successfully for ${result.metric.api_name}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleLoadSample = async (req, res, next) => {
  try {
    const customPath = req.body?.filePath || null;
    const result = await monitorService.processStaticJsonFile(customPath);
    return res.status(200).json({
      success: true,
      message: `Successfully loaded and processed static sample dataset (${result.totalProcessed} records)`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentRecords = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const records = dbService.getRecentRecords(limit);
    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleMonitor,
  handleLoadSample,
  getRecentRecords,
};
