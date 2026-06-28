import type { NextFunction, Request, Response } from "express";
import {
  type PostAuthenticateRequest,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { createAccountClient } from "@repo/gw2api-adapter/account";
import { JWT_PRIVATE_KEY } from "../config";
import { createAuthenticationService } from "@repo/authentication/authentication-service";
import type { BaseErrorApiResponse } from "@repo/contracts/api-gateway/response-common";
import { ErrorCode } from "@repo/contracts/error";

export const authenticate = async (
  req: Request<PostAuthenticateRequest>,
  res: Response<PostAuthenticateResponse>,
  next: NextFunction,
) => {
  const authenticationService = createAuthenticationService(
    createAccountClient(),
  );
  try {
    const response =
      await authenticationService.getAuthenticationJwtByGw2ApiKey(
        req.body,
        JWT_PRIVATE_KEY,
      );
    if ("error" === response.status) {
      return next(response);
    }
    return res.status(201).send(response);
  } catch {
    return next({
      status: "error",
      errorCode: ErrorCode.ERROR_AUTHENTICATION_OTHER,
      message: "An error occurred when tried to authenticate the user",
    } as BaseErrorApiResponse);
  }
};
