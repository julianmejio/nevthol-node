import type { Request, Response } from "express";
import {
  type PostChallengeRequest,
  PostChallengeRequestSchema,
  type PostChallengeResponse,
  type PostSolveRequest,
  PostSolveRequestSchema,
  type PostSolveResponse,
} from "@repo/contracts/api-gateway/elevation";
import { Effect } from "effect";
import {
  ElevationService,
  type ElevationServiceConfig,
} from "@repo/authentication/elevation-service";
import { type AppError, ErrorCode } from "@repo/contracts/error";

export const ElevationController = {
  postChallenge: (
    req: Request<unknown, unknown, PostChallengeRequest>,
    res: Response<PostChallengeResponse>,
  ): Effect.Effect<PostChallengeResponse, AppError, ElevationService> =>
    Effect.gen(function* () {
      const body = PostChallengeRequestSchema.safeParse(req.body);
      if (!body.success) {
        return yield* Effect.fail<AppError>({
          errorCode: ErrorCode.ERROR_AUTHENTICATION_BAD_CREDENTIAL,
          message: body.error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        });
      }
      const { token } = req.body;
      const elevationService = yield* ElevationService;

      const challenge = yield* elevationService.challenge(token);

      res.status(201);
      return challenge;
    }),
  postSolve: (
    req: Request,
    res: Response<PostSolveResponse>,
  ): Effect.Effect<
    PostSolveResponse,
    AppError,
    ElevationService | ElevationServiceConfig
  > =>
    Effect.gen(function* () {
      const elevationService = yield* ElevationService;
      const fullRequest: PostSolveRequest = {
        ...req.body,
        id: req.params.id,
      };
      const parsedFullRequest = PostSolveRequestSchema.safeParse(fullRequest);
      if (!parsedFullRequest.success) {
        return yield* Effect.fail<AppError>({
          errorCode: ErrorCode.ERROR_AUTHENTICATION_BAD_CREDENTIAL,
          message: parsedFullRequest.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("\r\n"),
        });
      }
      const passport = yield* elevationService.solve(parsedFullRequest.data);
      res.status(201);
      return passport;
    }),
};
