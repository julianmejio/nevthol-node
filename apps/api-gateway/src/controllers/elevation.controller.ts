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
import { type AppError, AppErrorCode } from "@repo/contracts/error";
import { ElevationService } from "@repo/authentication/elevation-service";

export const ElevationController = {
  postChallenge: (
    req: Request<unknown, unknown, PostChallengeRequest>,
    res: Response<PostChallengeResponse>,
  ): Effect.Effect<PostChallengeResponse, AppError, ElevationService> =>
    Effect.gen(function* () {
      const body = PostChallengeRequestSchema.safeParse(req.body);
      if (!body.success) {
        return yield* Effect.fail<AppError>({
          errorCode: AppErrorCode.UNKNOWN,
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
  ): Effect.Effect<PostSolveResponse, AppError, ElevationService> =>
    Effect.gen(function* () {
      const elevationService = yield* ElevationService;
      const fullRequest: PostSolveRequest = {
        ...req.body,
        id: req.params.id,
      };
      const parsedFullRequest = PostSolveRequestSchema.safeParse(fullRequest);
      if (!parsedFullRequest.success) {
        return yield* Effect.fail<AppError>({
          errorCode: AppErrorCode.UNKNOWN,
          message: parsedFullRequest.error.message,
        });
      }
      const passport = yield* elevationService.solve(parsedFullRequest.data);
      res.status(201);
      return passport;
    }),
};
