import { timingSafeEqual } from "node:crypto";
import { AccountApi } from "@repo/game-api/account";
import { nanoid } from "nanoid";
import type {
  ChallengePuzzle,
  ChallengeSolution,
  ChallengeMetadata,
  Passport,
} from "@repo/contracts/api-gateway/elevation";
import { ElevationStore } from "@repo/authentication-store/elevation-store";
import { Effect, Context, Layer } from "effect";
import { type AppError, AppErrorCode } from "@repo/contracts/error";

const DIGEST = "SHA-256";
const TEST_API_KEY_NAME_PREFIX = "gwradar.com_verify_account_";

const calculateHkdf = async (
  ikm: Buffer,
  digest: string,
  accountGuid: string,
) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(ikm),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: digest,
      salt: encoder.encode(accountGuid),
      info: encoder.encode("elevated-authentication"),
    },
    key,
    { name: "HMAC", hash: digest, length: 256 },
    false,
    ["sign"],
  );
};

export interface ElevationServiceConfig {
  readonly ikm: Buffer;
}
export const ElevationServiceConfig =
  Context.GenericTag<ElevationServiceConfig>("ElevationServiceConfig");

export interface ElevationService {
  readonly challenge: (
    token: string,
    expirationSeconds?: number,
  ) => Effect.Effect<ChallengePuzzle, AppError, never>;
  readonly solve: (
    solution: ChallengeSolution,
  ) => Effect.Effect<Passport, AppError, never>;
}
export const ElevationService =
  Context.GenericTag<ElevationService>("ElevationService");

export const ElevationServiceLive = Layer.effect(
  ElevationService,
  Effect.gen(function* () {
    const api = yield* AccountApi;
    const store = yield* ElevationStore;
    const config = yield* ElevationServiceConfig;
    return ElevationService.of({
      challenge: (token: string, expirationSeconds = 300) =>
        Effect.gen(function* () {
          const [account, tokenInfo] = yield* Effect.all([
            api.getAccount(token),
            api.getTokenInfo(token),
          ]);

          const challengeMetadata: ChallengeMetadata = {
            id: nanoid(),
            accountId: account.id,
            tokenId: tokenInfo.id,
            test: `${TEST_API_KEY_NAME_PREFIX}${nanoid(8)}`,
          };

          yield* store.registerChallenge(challengeMetadata, expirationSeconds);

          return {
            id: challengeMetadata.id,
            test: challengeMetadata.test,
          };
        }),
      solve: (solution: ChallengeSolution) =>
        Effect.gen(function* () {
          const encoder = new TextEncoder();
          const challengeMetadata = yield* store.consumeChallenge(solution.id);

          const [account, tokenInfo] = yield* Effect.all(
            [
              api.getAccount(solution.solution),
              api.getTokenInfo(solution.solution),
            ],
            { concurrency: "unbounded" },
          );

          const [
            expectedAccountId,
            actualAccountId,
            expectedSolution,
            actualSolution,
          ] = yield* Effect.all([
            Effect.tryPromise(() =>
              crypto.subtle.digest(
                DIGEST,
                encoder.encode(challengeMetadata.accountId),
              ),
            ),
            Effect.tryPromise(() =>
              crypto.subtle.digest(DIGEST, encoder.encode(account.id)),
            ),
            Effect.tryPromise(() =>
              crypto.subtle.digest(
                DIGEST,
                encoder.encode(challengeMetadata.test),
              ),
            ),
            Effect.tryPromise(() =>
              crypto.subtle.digest(DIGEST, encoder.encode(tokenInfo.name)),
            ),
          ] as const).pipe(
            Effect.map(
              ([h1, h2, h3, h4]) =>
                [
                  Buffer.from(h1),
                  Buffer.from(h2),
                  Buffer.from(h3),
                  Buffer.from(h4),
                ] as const,
            ),
            Effect.mapError(
              (): AppError => ({
                errorCode: AppErrorCode.UNKNOWN,
                message:
                  "An error occurred when tried to verify the solution. Try again starting a new elevation challenge",
              }),
            ),
          );
          yield* Effect.all([
            Effect.succeed(timingSafeEqual(expectedAccountId, actualAccountId)),
            Effect.succeed(timingSafeEqual(expectedSolution, actualSolution)),
          ]).pipe(
            Effect.map(
              ([accountVerification, solutionVerification]) =>
                accountVerification && solutionVerification,
            ),
            Effect.filterOrFail(
              (isValid) => isValid,
              (): AppError => ({
                errorCode: AppErrorCode.UNKNOWN,
                message:
                  "Wrong solution. Either the solution does not belong to the expected account, or the name of the token is not the expected one",
              }),
            ),
          );
          const signingKey = yield* Effect.tryPromise({
            try: () => calculateHkdf(config.ikm, DIGEST, account.id),
            catch: (): AppError => ({
              errorCode: AppErrorCode.UNKNOWN,
              message:
                "Could not elevate privileges right now. Try again later",
            }),
          });
          return yield* Effect.tryPromise({
            try: () =>
              crypto.subtle.sign(
                "HMAC",
                signingKey,
                Buffer.from(challengeMetadata.tokenId),
              ),
            catch: (): AppError => ({
              errorCode: AppErrorCode.UNKNOWN,
              message:
                "Could not elevate privileges right now. Try again later",
            }),
          }).pipe(
            Effect.map(
              (signature): Passport => ({
                accountId: challengeMetadata.accountId,
                tokenId: challengeMetadata.tokenId,
                signature: Buffer.from(signature).toString("base64"),
              }),
            ),
          );
        }),
    });
  }),
);
