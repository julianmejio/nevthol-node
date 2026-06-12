import { AppErrorCode } from "@repo/contracts/error";
import type { NextFunction, Request, Response } from "express";
import type { BaseErrorApiResponse } from "@repo/contracts/api-gateway/response-common";

type ResponderMultiplexer = {
  [K in (typeof AppErrorCode)[keyof typeof AppErrorCode]]: (
    res: Response,
    err: BaseErrorApiResponse,
  ) => void;
};

const errorMultiplexer: ResponderMultiplexer = {
  [AppErrorCode.AUTHENTICATION_INVALID_AUTHENTICATION]: (
    res: Response,
    err: BaseErrorApiResponse,
  ) => res.status(400).send(err),
  [AppErrorCode.AUTHENTICATION_GENERIC_ERROR]: (
    res: Response,
    err: BaseErrorApiResponse,
  ) => res.status(400).send(err),
  [AppErrorCode.GW2_API_ERROR]: (res: Response, err: BaseErrorApiResponse) =>
    res.status(502).send(err),
  [AppErrorCode.GW2_ACCOUNT_INVALID_CHARACTER_LIST]: (
    res: Response,
    err: BaseErrorApiResponse,
  ) => res.status(502).send(err),
  [AppErrorCode.UNKNOWN]: (res: Response, err: BaseErrorApiResponse) =>
    res.status(500).send(err),
};

const errorHandler = (
  err: BaseErrorApiResponse,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  void _next;
  if ("error" === err.status && err.errorCode in errorMultiplexer) {
    return errorMultiplexer[err.errorCode](res, err);
  }
  req.log.fatal({ err }, "Unhandled code exception");
  return res.status(500).send({
    status: "error",
    errorCode: AppErrorCode.UNKNOWN,
    message: "An unexpected error occurred.",
  } as BaseErrorApiResponse);
};

export { errorHandler };
