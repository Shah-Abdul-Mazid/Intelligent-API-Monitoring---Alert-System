import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = new Database(config.dbPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    initTables(dbInstance);
  }
  return dbInstance;
};

const initTables = (db) => {
  logger.info(`Initializing SQLite database at: ${config.dbPath}`);

  // Create monitored_records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitored_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_name TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      records_returned INTEGER NOT NULL,
      is_anomaly INTEGER DEFAULT 0,
      payload_meta TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER,
      api_name TEXT NOT NULL,
      response_time_ms INTEGER NOT NULL,
      status_code INTEGER NOT NULL,
      records_returned INTEGER NOT NULL,
      anomaly_types TEXT NOT NULL,
      severity TEXT NOT NULL,
      ai_alert_message TEXT NOT NULL,
      ai_root_cause TEXT,
      ai_recommendation TEXT,
      status TEXT DEFAULT 'ACTIVE',
      email_sent INTEGER DEFAULT 0,
      email_preview_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (record_id) REFERENCES monitored_records(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
    CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
    CREATE INDEX IF NOT EXISTS idx_anomalies_created ON anomalies(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_records_created ON monitored_records(created_at DESC);
  `);
};

export const dbService = {
  insertRecord(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO monitored_records (api_name, response_time_ms, status_code, records_returned, is_anomaly, payload_meta)
      VALUES (@api_name, @response_time_ms, @status_code, @records_returned, @is_anomaly, @payload_meta)
    `);
    const info = stmt.run({
      api_name: data.api_name,
      response_time_ms: data.response_time_ms,
      status_code: data.status_code,
      records_returned: data.records_returned,
      is_anomaly: data.is_anomaly ? 1 : 0,
      payload_meta: data.payload_meta ? JSON.stringify(data.payload_meta) : null,
    });
    return info.lastInsertRowid;
  },

  insertAnomaly(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO anomalies (
        record_id, api_name, response_time_ms, status_code, records_returned,
        anomaly_types, severity, ai_alert_message, ai_root_cause, ai_recommendation,
        status, email_sent, email_preview_url
      ) VALUES (
        @record_id, @api_name, @response_time_ms, @status_code, @records_returned,
        @anomaly_types, @severity, @ai_alert_message, @ai_root_cause, @ai_recommendation,
        @status, @email_sent, @email_preview_url
      )
    `);
    const info = stmt.run({
      record_id: data.record_id || null,
      api_name: data.api_name,
      response_time_ms: data.response_time_ms,
      status_code: data.status_code,
      records_returned: data.records_returned,
      anomaly_types: typeof data.anomaly_types === 'string' ? data.anomaly_types : JSON.stringify(data.anomaly_types || []),
      severity: data.severity || 'WARNING',
      ai_alert_message: data.ai_alert_message,
      ai_root_cause: data.ai_root_cause || '',
      ai_recommendation: data.ai_recommendation || '',
      status: data.status || 'ACTIVE',
      email_sent: data.email_sent ? 1 : 0,
      email_preview_url: data.email_preview_url || null,
    });
    return this.getAnomalyById(info.lastInsertRowid);
  },

  getAnomalies({ status, severity, api_name, limit = 50, offset = 0 } = {}) {
    const db = getDb();
    let query = `SELECT * FROM anomalies WHERE 1=1`;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (severity && severity !== 'ALL') {
      query += ` AND severity = ?`;
      params.push(severity);
    }
    if (api_name) {
      query += ` AND api_name LIKE ?`;
      params.push(`%${api_name}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    return rows.map((r) => ({
      ...r,
      anomaly_types: safeJsonParse(r.anomaly_types, []),
      email_sent: Boolean(r.email_sent),
    }));
  },

  getAnomalyById(id) {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM anomalies WHERE id = ?`).get(id);
    if (!row) return null;
    return {
      ...row,
      anomaly_types: safeJsonParse(row.anomaly_types, []),
      email_sent: Boolean(row.email_sent),
    };
  },

  updateAnomalyStatus(id, status) {
    const db = getDb();
    const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;
    const stmt = db.prepare(`
      UPDATE anomalies
      SET status = ?,
          resolved_at = CASE WHEN ? = 'RESOLVED' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = stmt.run(status, status, id);
    if (info.changes === 0) return null;
    return this.getAnomalyById(id);
  },

  markAnomalyEmailSent(id, previewUrl = null) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE anomalies
      SET email_sent = 1,
          email_preview_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(previewUrl, id);
    return this.getAnomalyById(id);
  },

  getStats() {
    const db = getDb();
    const totalRecords = db.prepare(`SELECT COUNT(*) AS count FROM monitored_records`).get().count;
    const totalAnomalies = db.prepare(`SELECT COUNT(*) AS count FROM anomalies`).get().count;
    const activeAnomalies = db.prepare(`SELECT COUNT(*) AS count FROM anomalies WHERE status = 'ACTIVE'`).get().count;
    const resolvedAnomalies = db.prepare(`SELECT COUNT(*) AS count FROM anomalies WHERE status = 'RESOLVED'`).get().count;
    const criticalCount = db.prepare(`SELECT COUNT(*) AS count FROM anomalies WHERE severity = 'CRITICAL' AND status = 'ACTIVE'`).get().count;
    const warningCount = db.prepare(`SELECT COUNT(*) AS count FROM anomalies WHERE severity = 'WARNING' AND status = 'ACTIVE'`).get().count;
    
    const avgLatencyRow = db.prepare(`SELECT AVG(response_time_ms) AS avg_latency FROM monitored_records`).get();
    const avgLatency = avgLatencyRow && avgLatencyRow.avg_latency ? Math.round(avgLatencyRow.avg_latency) : 0;

    return {
      totalRecords,
      totalAnomalies,
      activeAnomalies,
      resolvedAnomalies,
      criticalCount,
      warningCount,
      avgLatency,
    };
  },

  getRecentRecords(limit = 20) {
    const db = getDb();
    return db.prepare(`SELECT * FROM monitored_records ORDER BY created_at DESC LIMIT ?`).all(Number(limit));
  },

  clearAll() {
    const db = getDb();
    db.exec(`
      DELETE FROM anomalies;
      DELETE FROM monitored_records;
    `);
  },
};

const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    const val = JSON.parse(str);
    return Array.isArray(val) ? val : [val];
  } catch {
    return typeof str === 'string' && str ? [str] : fallback;
  }
};

export default dbService;
