import {
  type AppError,
  AppErrorCode,
  type AppErrorCodeEnum,
  AppErrorSchema,
} from "@repo/contracts/error";
import type { NextFunction, Request, Response } from "express";
import type { FiberFailure } from "effect/Runtime";
import { createLogger } from "@repo/logger";

type ResponderMultiplexer = {
  [K in (typeof AppErrorCode)[keyof typeof AppErrorCode]]: (
    res: Response,
    err: AppError,
  ) => void;
};

const logger = createLogger({ serviceName: "api-gateway" });

const errorMultiplexer: ResponderMultiplexer = {
  [AppErrorCode.AUTHENTICATION_INVALID_AUTHENTICATION]: (
    res: Response,
    err: AppError,
  ) => res.status(400).send(err),
  [AppErrorCode.AUTHENTICATION_GENERIC_ERROR]: (res: Response, err: AppError) =>
    res.status(400).send(err),
  [AppErrorCode.GW2_API_ERROR]: (res: Response, err: AppError) =>
    res.status(502).send(err),
  [AppErrorCode.GW2_ACCOUNT_INVALID_CHARACTER_LIST]: (
    res: Response,
    err: AppError,
  ) => res.status(502).send(err),
  [AppErrorCode.UNKNOWN]: (res: Response, err: AppError) =>
    res.status(500).send(err),
};

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
      const errorResponder =
        errorMultiplexer[safeAppError.data.errorCode as AppErrorCodeEnum];
      if (undefined !== errorResponder) {
        return errorResponder(res, safeAppError.data);
      }
      logger.critical(
        "No error responder in error multiplexer list was found for error code",
        {
          app_error: safeAppError.data,
          original_error_message: (err as Error)?.message,
          original_error_stack: (err as Error)?.stack,
        },
      );
      return res.status(500).json({
        errorCode: AppErrorCode.UNKNOWN,
        message: "An unexpected error occurred. Please try again",
      } as AppError);
    }
    logger.critical("Error could not be parsed as AppError", {
      error: appError,
      original_error_message: (err as Error)?.message,
      original_error_stack: (err as Error)?.stack,
    });
    return res.status(500).json({
      errorCode: AppErrorCode.UNKNOWN,
      message: "An unexpected error occurred. Please try again",
    } as AppError);
  } catch (error) {
    logger.critical("Unhandled, non JSON error", {
      error_unhandled: error,
      original_error_message: (err as Error)?.message,
      original_error_stack: (err as Error)?.stack,
    });
    return res.status(500).json({
      errorCode: AppErrorCode.UNKNOWN,
      message: "An unexpected error occurred. Please try again",
    } as AppError);
  }
};

export { errorHandler };
