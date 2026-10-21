import assert from 'assert';
import monitorService from '../services/monitorService.js';
import dbService from '../db/database.js';
import config from '../config/index.js';

async function runTests() {
  console.log('--- Starting Intelligent API Monitoring Test Suite ---');

  // Test 1: Healthy API telemetry
  console.log('1. Testing Healthy API Metric...');
  const healthyMetric = {
    api_name: 'PatientDataAPI',
    response_time_ms: 1200,
    status_code: 200,
    records_returned: 50,
  };
  const healthyRes = await monitorService.processSingleMetric(healthyMetric);
  assert.strictEqual(healthyRes.evaluation.isAnomaly, false, 'Healthy metric should not be flagged as anomaly');
  assert.strictEqual(healthyRes.anomaly, null, 'Healthy metric should not create an anomaly record');
  console.log('   ✓ Healthy metric passed.');

  // Test 2: Critical Anomaly (AppointmentAPI)
  console.log('2. Testing Critical Anomaly (AppointmentAPI status 500, 0 records)...');
  const criticalMetric = {
    api_name: 'AppointmentAPI',
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0,
  };
  const criticalRes = await monitorService.processSingleMetric(criticalMetric);
  assert.strictEqual(criticalRes.evaluation.isAnomaly, true, 'Critical failure must be flagged');
  assert.strictEqual(criticalRes.evaluation.severity, 'CRITICAL', 'Severity must be CRITICAL');
  assert.ok(criticalRes.anomaly.ai_alert_message.includes('AppointmentAPI'), 'AI Alert message should mention AppointmentAPI');
  console.log(`   ✓ Alert Message: "${criticalRes.anomaly.ai_alert_message}"`);
  console.log('   ✓ Critical anomaly test passed.');

  // Test 3: Batch Ingestion from Static JSON
  console.log('3. Testing Batch Processing via Static JSON File...');
  const batchRes = await monitorService.processStaticJsonFile(config.sampleDataPath);
  assert.ok(batchRes.totalProcessed > 0, 'Batch should process records');
  assert.ok(batchRes.anomaliesDetected > 0, 'Batch should detect anomalies');
  console.log(`   ✓ Ingested ${batchRes.totalProcessed} records, detected ${batchRes.anomaliesDetected} anomalies.`);

  // Test 4: Database query verification
  console.log('4. Verifying Database Querying...');
  const activeAlerts = dbService.getAnomalies({ status: 'ACTIVE' });
  assert.ok(activeAlerts.length > 0, 'Active alerts should be stored in database');
  const stats = dbService.getStats();
  assert.ok(stats.totalRecords > 0, 'Stats total records should be > 0');
  console.log(`   ✓ Stats: ${stats.totalRecords} total records, ${stats.activeAnomalies} active anomalies, avg latency ${stats.avgLatency}ms.`);

  console.log('\n--- All Automated Verification Tests Passed Successfully! ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
