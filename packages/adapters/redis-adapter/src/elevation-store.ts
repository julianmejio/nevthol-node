import { Layer, Effect } from "effect";
import { ElevationStore } from "@repo/authentication-store/elevation-store";
import { RedisAdapterParameters } from "./configuration.js";
import { createClient } from "redis";
import { createLogger } from "@repo/logger";
import { getNamespace } from "./common.js";
import { ChallengeMetadataSchema } from "@repo/contracts/api-gateway/elevation";
import { type AppError, ErrorCode } from "@repo/contracts/error";

const log = createLogger({
  serviceName: "elevation-store",
  logLevel: "debug",
});

const REDIS_NAMESPACE_ELEVATION_CHALLENGES = "elevation:challenges";

export const ElevationStoreLive = Layer.scoped(
  ElevationStore,
  Effect.gen(function* () {
    const config = yield* RedisAdapterParameters;

    const client = yield* Effect.acquireRelease(
      Effect.gen(function* () {
        const redisClient = createClient(config);
        redisClient.on("error", () => log.critical("Redis connection dropped"));
        yield* Effect.tryPromise({
          try: () => redisClient.connect(),
          catch: (): AppError => ({
            errorCode: ErrorCode.ERROR_REDIS_COULD_NOT_SAVE_VALUE,
            message: "Could not connect to memory storage",
          }),
        });
        return redisClient;
      }),
      (redisClient) =>
        Effect.tryPromise({
          try: () => redisClient.quit(),
          catch: () => log.warn("Could not close connection to memory storage"),
        }).pipe(Effect.orDie),
    );

    // ✅ The fix: Bring the opening brace up to the same line as 'return'
    return {
      registerChallenge: (challenge, expirationSeconds) =>
        Effect.tryPromise({
          try: async () => {
            const key = getNamespace(
              REDIS_NAMESPACE_ELEVATION_CHALLENGES,
              challenge.id,
            );
            await client
              .multi()
              .hSet(key, challenge)
              .expire(key, expirationSeconds)
              .exec();
          },
          catch: (): AppError => ({
            errorCode: ErrorCode.ERROR_REDIS_COULD_NOT_SAVE_VALUE,
            message: "Could not save the challenge in memory.",
          }),
        }),

      consumeChallenge: (challengeId: string) =>
        Effect.tryPromise({
          try: async () => {
            const key = getNamespace(
              REDIS_NAMESPACE_ELEVATION_CHALLENGES,
              challengeId,
            );
            const challenge = await client.hGetAll(key);
            const safeChallenge = ChallengeMetadataSchema.parse(challenge);
            await client.unlink(key);
            return safeChallenge;
          },
          catch: (): AppError => ({
            errorCode: ErrorCode.ERROR_AUTHENTICATION_CHALLENGE_EXPIRED,
            message: "Challenge is not valid anymore.",
          }),
        }),
    } as ElevationStore;
  }),
);
