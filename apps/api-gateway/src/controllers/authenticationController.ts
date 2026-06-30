import type { Request, Response } from "express";
import {
  type PostAuthenticateRequest,
  PostAuthenticateRequestSchema,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { type AppError, ErrorCode } from "@repo/contracts/error";
import { Effect } from "effect";
import { AuthenticationService } from "@repo/authentication/authentication-service";
import type { ZodError } from "zod";
import type {
  ElevationService,
  ElevationServiceConfig,
} from "@repo/authentication/elevation-service";
import type { AccountApi } from "@repo/game-api/account";

export const AuthenticationController = {
  postAuthenticate: (
    req: Request<unknown, unknown, PostAuthenticateRequest>,
    res: Response<PostAuthenticateResponse>,
  ): Effect.Effect<
    PostAuthenticateResponse,
    AppError,
    | AuthenticationService
    | ElevationService
    | ElevationServiceConfig
    | AccountApi
  > =>
    Effect.gen(function* () {
      const request = yield* Effect.try({
        try: () => PostAuthenticateRequestSchema.parse(req.body),
        catch: (error): AppError => ({
          errorCode: ErrorCode.ERROR_GENERAL_BAD_INPUT,
          message: (error as ZodError).issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("\r\n"),
        }),
      });
      const authentication = yield* AuthenticationService;
      const response = yield* authentication.authenticate(
        request.token,
        request.elevationToken,
      );
      res.status(201);
      return response;
    }),
};
