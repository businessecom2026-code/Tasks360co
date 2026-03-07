/**
 * Zod Validation Middleware Factory
 *
 * Usage:
 *   import { validate } from '../middleware/validate.js';
 *   import { loginSchema } from '../schemas/auth.js';
 *   router.post('/login', validate(loginSchema), handler);
 *
 * On validation failure, returns 400 with:
 *   { error: "Validation failed", details: [{ field: "email", message: "Invalid email" }] }
 */

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details,
      });
    }

    // Replace req.body with the parsed/validated data (strips unknown fields)
    req.body = result.data;
    next();
  };
}
