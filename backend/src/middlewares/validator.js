import { z } from 'zod';

const metricSchema = z.object({
  api_name: z.string().min(1, 'api_name is required'),
  response_time_ms: z.number().nonnegative('response_time_ms must be a non-negative number'),
  status_code: z.number().int().min(100).max(599, 'status_code must be a valid HTTP status code between 100 and 599'),
  records_returned: z.number().int().nonnegative('records_returned must be a non-negative integer').optional().default(0),
  payload_meta: z.record(z.any()).optional(),
});

const monitorPayloadSchema = z.union([
  metricSchema,
  z.array(metricSchema).min(1, 'Array must contain at least one metric object'),
]);

export const validateMonitorPayload = (req, res, next) => {
  try {
    const parsed = monitorPayloadSchema.parse(req.body);
    req.validatedData = parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Invalid Request Payload',
    });
  }
};

export default {
  validateMonitorPayload,
};
