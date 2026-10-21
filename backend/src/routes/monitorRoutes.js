import { Router } from 'express';
import monitorController from '../controllers/monitorController.js';
import { validateMonitorPayload } from '../middlewares/validator.js';

const router = Router();

// POST /monitor - Ingest single or batch API metrics
router.post('/', validateMonitorPayload, monitorController.handleMonitor);

// POST or GET /monitor/load-sample - Load static sample JSON file
router.post('/load-sample', monitorController.handleLoadSample);
router.get('/load-sample', monitorController.handleLoadSample);

// GET /monitor/records - View recent raw telemetry records
router.get('/records', monitorController.getRecentRecords);

export default router;
