import type { Request, Response } from "express";
import {
  type PostAuthenticateRequest,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { createAccountClient } from "@repo/gw2api-adapter/account";
import { type AppError, AppErrorCode } from "@repo/contracts/error";
import { JWT_PRIVATE_KEY } from "../config";
import { createAuthenticationService } from "@repo/authentication/authentication-service";
import { createConnectionStore } from "@repo/redis-adapter/connection";

export const authenticate = async (
  req: Request<PostAuthenticateRequest>,
  res: Response<PostAuthenticateResponse | AppError>,
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
    return res.status(201).send(response);
  } catch {
    return res.status(500).send({
      errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
      message: "An error occurred when tried to authenticate the user",
    });
  }
};
