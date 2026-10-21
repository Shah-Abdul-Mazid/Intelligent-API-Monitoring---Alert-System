import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, '../../../AI_Prompts.docx');

async function createPromptsDocx() {
  const doc = new Document({
    creator: 'Antigravity Engineering',
    title: 'AI Prompts & Integration Documentation',
    description: 'Complete documentation of AI prompts, prompt engineering strategy, and logic building.',
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Intelligent API Monitoring & Alert System',
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: 'AI Prompts, System Directives & Logic Engineering Documentation',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Author: ', bold: true }),
              new TextRun('Engineering Candidate\n'),
              new TextRun({ text: 'Target System: ', bold: true }),
              new TextRun('Intelligent API Monitoring & Alert System\n'),
              new TextRun({ text: 'AI Model: ', bold: true }),
              new TextRun('Google Gemini 2.5 Flash / Gemini 1.5 Flash (with Intelligent Heuristic Engine fallback)\n'),
              new TextRun({ text: 'Date: ', bold: true }),
              new TextRun(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
            ],
            spacing: { after: 400 },
          }),

          // Section 1
          new Paragraph({
            text: '1. Executive Summary & AI Integration Strategy',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            text: 'In this system, AI (Large Language Models) is deployed at the anomaly response layer to translate raw, multi-dimensional API telemetry (HTTP status codes, latency in milliseconds, and returned record counts) into concise, human-readable, context-aware operational alerts, probable root-cause hypotheses, and actionable remediation instructions for on-call engineers.',
            spacing: { after: 200 },
          }),

          // Section 2
          new Paragraph({
            text: '2. Primary Alert Generation System Prompt',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            text: 'The following structured prompt is transmitted to the LLM API whenever the rule-based anomaly detector triggers an alert condition.',
            spacing: { after: 120 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `You are an expert Site Reliability Engineer (SRE) monitoring critical healthcare APIs.\nAn anomalous API telemetry event has been detected:\n\nAPI Telemetry Data:\n- API Name: {api_name}\n- Response Time: {response_time_ms} ms (Warning threshold: {latencyWarningMs}ms, Critical: {latencyCriticalMs}ms)\n- HTTP Status Code: {status_code}\n- Records Returned: {records_returned}\n- Detected Anomaly Types: {anomalyTypes}\n- Technical Reasons: {technicalReasons}\n\nTask:\nGenerate a concise, human-readable alert, root cause diagnosis, and action plan.\nMatch the tone and format of this example:\n"AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue."\n\nReturn ONLY valid JSON matching this exact structure with no extra markdown formatting:\n{\n  "alert": "Concise human-readable alert message",\n  "root_cause": "Probable root cause hypothesis",\n  "recommendation": "Immediate actionable recommendation for DevOps/Engineering"\n}`,
                font: 'Courier New',
                size: 19,
              }),
            ],
            shading: {
              type: ShadingType.CLEAR,
              fill: 'F1F5F9',
            },
            spacing: { after: 240, before: 120 },
          }),

          // Section 3
          new Paragraph({
            text: '3. Prompt Engineering Design Decisions',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Role-Based Framing: ', bold: true }),
              new TextRun('Specifying the persona as an expert SRE ensures the alerts are operationally focused and free of fluff or conversational filler.\n'),
              new TextRun({ text: '• Few-Shot Grounding: ', bold: true }),
              new TextRun('Incorporating the assignment specification example ("AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.") anchors the output length and clarity.\n'),
              new TextRun({ text: '• Structured JSON Schema: ', bold: true }),
              new TextRun('Enforcing JSON output mode prevents downstream parsing errors and separates the human alert string from root-cause and triage action items.\n'),
              new TextRun({ text: '• Deterministic Fallback: ', bold: true }),
              new TextRun('A heuristic engine is bundled so that even if the API key is not supplied or the network is offline, the system continues to operate without breaking.\n'),
            ],
            spacing: { after: 240 },
          }),

          // Section 4
          new Paragraph({
            text: '4. Example Input and Generated AI Output Pair',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Input Telemetry:\n', bold: true }),
              new TextRun('{\n  "api_name": "AppointmentAPI",\n  "response_time_ms": 5500,\n  "status_code": 500,\n  "records_returned": 0\n}\n\n'),
              new TextRun({ text: 'Generated Output:\n', bold: true }),
              new TextRun('{\n  "alert": "AppointmentAPI failed with status 500 and returned 0 records. Possible outage or data issue.",\n  "root_cause": "Downstream database crash or internal server exception preventing database query execution in AppointmentAPI.",\n  "recommendation": "Inspect application error logs, verify downstream database connectivity, and restart pods if necessary."\n}'),
            ],
            shading: {
              type: ShadingType.CLEAR,
              fill: 'F8FAFC',
            },
            spacing: { after: 240 },
          }),

          // Section 5
          new Paragraph({
            text: '5. AI Usage in Codebase Development',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Code Generation: ', bold: true }),
              new TextRun('AI assisted in drafting boilerplate scaffolding, React UI components, Winston logger configuration, and SQLite table schema definitions.\n'),
              new TextRun({ text: '• Logic Building: ', bold: true }),
              new TextRun('AI assisted in structuring the rule-based anomaly detection matrix (5xx vs 4xx, latency tiers, and zero-record validation) to guarantee comprehensive coverage.\n'),
              new TextRun({ text: '• Prompt Design: ', bold: true }),
              new TextRun('Prompt iterations were tested to achieve strict JSON parsing compliance and concise alert generation.\n'),
            ],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`AI_Prompts.docx successfully generated at: ${outputPath}`);
}

createPromptsDocx().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
