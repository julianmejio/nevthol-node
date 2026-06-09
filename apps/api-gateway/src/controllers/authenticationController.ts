import type { Request, Response, NextFunction } from "express";
import {
  type PostAuthenticateRequest,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { createAccountClient } from "@repo/gw2api-adapter/account";
import { type AppError, AppErrorCode } from "@repo/contracts/error";
import { JWT_PRIVATE_KEY } from "../config";
import createAuthenticationService from "@repo/authentication/authentication-service";

export const authenticate = async (
  req: Request<PostAuthenticateRequest>,
  res: Response<PostAuthenticateResponse | AppError>,
  _next: NextFunction,
) => {
  const authenticationService = createAuthenticationService(
    createAccountClient(),
  );
  try {
    const response =
      await authenticationService.getAuthenticationJwtByGw2ApiKey(
        req.body,
        JWT_PRIVATE_KEY,
        {
          issuer: "com.gwradar.login",
          audience: "com.gwradar.login",
          subject: "com.gwradar.jwt",
        },
      );
    return res.status(201).send(response);
  } catch {
    return res.status(500).send({
      errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
      message: "An error occurred when tried to authenticate the user",
    });
  }
};
