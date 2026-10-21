import { Router } from 'express';
import alertController from '../controllers/alertController.js';

const router = Router();

// GET /alerts - Fetch active and historical anomalies
router.get('/', alertController.getAlerts);

// GET /alerts/stats - Fetch summary metrics for dashboard KPIs
router.get('/stats', alertController.getAlertStats);

// GET /alerts/:id - Fetch detailed alert information
router.get('/:id', alertController.getAlertById);

// PATCH /alerts/:id/status - Update alert status (ACTIVE, ACKNOWLEDGED, RESOLVED)
router.patch('/:id/status', alertController.updateAlertStatus);

// POST /alerts/:id/email - Trigger email notification
router.post('/:id/email', alertController.sendAlertEmail);

// DELETE /alerts/reset - Reset test data
router.delete('/reset', alertController.resetData);

export default router;
