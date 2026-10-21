import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  latencyWarningMs: parseInt(process.env.LATENCY_WARNING_MS, 10) || 2000,
  latencyCriticalMs: parseInt(process.env.LATENCY_CRITICAL_MS, 10) || 4000,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || '"API Sentinel" <alerts@intelligent-api-monitoring.com>',
    recipient: process.env.ALERT_EMAIL_RECIPIENT || 'devops-oncall@example.com',
    autoSendOnCritical: process.env.AUTO_EMAIL_ON_CRITICAL === 'true',
  },
  dbPath: path.resolve(__dirname, '../../data/monitoring.db'),
  sampleDataPath: path.resolve(__dirname, '../../data/sample_api_responses.json'),
};

export default config;
