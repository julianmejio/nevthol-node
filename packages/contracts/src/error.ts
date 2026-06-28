import { z } from "zod";

export const ErrorCategory = {
  ERROR_SYSTEM: 0x0 << 4,
  ERROR_AUTHENTICATION: 0x1 << 4,
  ERROR_GW2_UPSTREAM: 0x2 << 4,
  ERROR_REDIS: 0x3 << 4,
  ERROR_UNKNOWN: 0xf << 4,
} as const;

/**
 * App error codes.
 */
export const ErrorCode = {
  // Authentication
  ERROR_AUTHENTICATION_BAD_CREDENTIAL: ErrorCategory.ERROR_AUTHENTICATION | 0x1,
  ERROR_AUTHENTICATION_CANNOT_ELEVATE: ErrorCategory.ERROR_AUTHENTICATION | 0x2,
  ERROR_AUTHENTICATION_CHALLENGE_EXPIRED:
    ErrorCategory.ERROR_AUTHENTICATION | 0x3,
  ERROR_AUTHENTICATION_BAD_CHALLENGE_SOLUTION:
    ErrorCategory.ERROR_AUTHENTICATION | 0x4,
  ERROR_AUTHENTICATION_OTHER: ErrorCategory.ERROR_AUTHENTICATION | 0x0,

  // Guild Wars 2 upstream
  ERROR_GW2_UPSTREAM_UNEXPECTED_RESPONSE:
    ErrorCategory.ERROR_GW2_UPSTREAM | 0x1,
  ERROR_GW2_UPSTREAM_UNABLE_TO_CONTACT: ErrorCategory.ERROR_GW2_UPSTREAM | 0x2,
  ERROR_GW2_UPSTREAM_OTHER: ErrorCategory.ERROR_GW2_UPSTREAM | 0x0,

  // Redis
  ERROR_REDIS_COULD_NOT_CONNECT: ErrorCategory.ERROR_REDIS | 0x1,
  ERROR_REDIS_COULD_NOT_SAVE_VALUE: ErrorCategory.ERROR_REDIS | 0x2,
  ERROR_REDIS_COULD_NOT_RETRIEVE_VALUE: ErrorCategory.ERROR_REDIS | 0x3,
  ERROR_REDIS_OTHER: ErrorCategory.ERROR_REDIS | 0x0,

  // Catch-all errors
  ERROR_COULD_NOT_FINISH_CRYPTO: ErrorCategory.ERROR_SYSTEM | 0x1,
  ERROR_UNKNOWN: ErrorCategory.ERROR_SYSTEM | 0xf,
  ERROR_OK: ErrorCategory.ERROR_SYSTEM | 0x0,
} as const;

/**
 * Enum for app error codes
 */
export const AppErrorCodeEnumSchema = z
  .enum(ErrorCode)
  .default(ErrorCode.ERROR_UNKNOWN)
  .describe("List of recognized errors");
export type AppErrorCodeEnum = z.infer<typeof AppErrorCodeEnumSchema>;

/**
 * Schema that describes the shape of an error response
 */
export const AppErrorSchema = z.object({
  errorCode: AppErrorCodeEnumSchema,
  message: z.string().optional().describe("Descriptive message of the error"),
});

/**
 * Schema that describes the shape of an error response
 */
export type AppError = z.infer<typeof AppErrorSchema>;
