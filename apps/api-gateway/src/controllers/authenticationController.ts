import type { NextFunction, Request, Response } from "express";
import {
  type PostAuthenticateRequest,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { createAccountClient } from "@repo/gw2api-adapter/account";
import { type AppError, AppErrorCode } from "@repo/contracts/error";
import { JWT_PRIVATE_KEY } from "../config";
import { createAuthenticationService } from "@repo/authentication/authentication-service";
import { createConnectionStore } from "@repo/redis-adapter/connection";
import type { BaseErrorApiResponse } from "@repo/contracts/api-gateway/response-common";

export const authenticate = async (
  req: Request<PostAuthenticateRequest>,
  res: Response<PostAuthenticateResponse | AppError>,
  next: NextFunction,
) => {
  const userClient = createConnectionStore({
    url: "redis://default@localhost:6379",
  });
  await userClient.connect();
  const authenticationService = createAuthenticationService(
    createAccountClient(),
    userClient,
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
      errorCode: AppErrorCode.UNKNOWN,
      message: "An error occurred when tried to authenticate the user",
    } as BaseErrorApiResponse);
  }
};
