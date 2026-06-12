import { z } from "zod";

/**
 * App error codes.
 */
const AppErrorCode = {
  // 1000: AUTHENTICATION_* error namespace
  AUTHENTICATION_INVALID_AUTHENTICATION: 1001,
  AUTHENTICATION_GENERIC_ERROR: 1099,
  // 2000 GW2 errors
  GW2_API_ERROR: 2099,
  // 2100 GW2 account errors
  GW2_ACCOUNT_INVALID_CHARACTER_LIST: 2101,
  UNKNOWN: 9999,
} as const;

/**
 * Enum for app error codes
 */
const AppErrorCodeEnum = z
  .enum(AppErrorCode)
  .default(AppErrorCode.UNKNOWN)
  .describe("List of recognized errors");
type AppErrorCodeEnum = z.infer<typeof AppErrorCodeEnum>;

/**
 * Schema that describes the shape of an error response
 */
const AppErrorSchema = z.object({
  errorCode: AppErrorCode,
  message: z.string().optional().describe("Descriptive message of the error"),
});

/**
 * Schema that describes the shape of an error response
 */
type AppError = z.infer<typeof AppErrorSchema>;

export { AppErrorCode, type AppErrorCodeEnum, AppErrorSchema, type AppError };
