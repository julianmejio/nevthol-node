import type { NextFunction, Request, Response } from "express";
import type { FiberFailure } from "effect/Runtime";
import { createLogger } from "@repo/logger";
import {
  type AppError,
  AppErrorSchema,
  ErrorCode,
} from "@repo/contracts/error";

const logger = createLogger({ serviceName: "api-gateway" });

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }
  try {
    const errorMessage =
      err && typeof err === "object"
        ? (err as FiberFailure).message
        : String(err);
    const appError = JSON.parse(errorMessage);
    const safeAppError = AppErrorSchema.safeParse(appError);
    if (safeAppError.success) {
      logger.critical(
        "No error responder in error multiplexer list was found for error code",
        {
          app_error: safeAppError.data,
          original_error_message: (err as Error)?.message,
          original_error_stack: (err as Error)?.stack,
        },
      );
      return res.status(500).json(safeAppError.data);
    }
    logger.critical("Error could not be parsed as AppError", {
      error: appError,
      original_error_message: (err as Error)?.message,
      original_error_stack: (err as Error)?.stack,
    });
    return res.status(500).json({
      errorCode: ErrorCode.ERROR_UNKNOWN,
      message: "An unexpected error occurred. Please try again",
    } as AppError);
  } catch (error) {
    logger.critical("Unhandled, non JSON error", {
      error_unhandled: error,
      original_error_message: (err as Error)?.message,
      original_error_stack: (err as Error)?.stack,
    });
    return res.status(500).json({
      errorCode: ErrorCode.ERROR_UNKNOWN,
      message: "An unexpected error occurred. Please try again",
    } as AppError);
  }
};

export { errorHandler };
