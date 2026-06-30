import { timingSafeEqual } from "node:crypto";
import { AccountApi } from "@repo/game-api/account";
import { nanoid } from "nanoid";
import type {
  ChallengePuzzle,
  ChallengeSolution,
  ChallengeMetadata,
  Passport,
  PassportValidation,
} from "@repo/contracts/api-gateway/elevation";
import { ElevationStore } from "@repo/authentication-store/elevation-store";
import { Effect, Context, Layer } from "effect";
import { type AppError, ErrorCode } from "@repo/contracts/error";

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
    ["sign", "verify"],
  );
};

const signElevation = (
  accountId: string,
  tokenId: string,
): Effect.Effect<string, AppError, ElevationServiceConfig> =>
  Effect.gen(function* () {
    const config = yield* ElevationServiceConfig;
    const hkdf = yield* Effect.tryPromise({
      try: () => calculateHkdf(config.ikm, DIGEST, accountId),
      catch: (): AppError => ({
        errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
        message: "Could not calculate the HKDF key for the account",
      }),
    });
    return yield* Effect.tryPromise({
      try: () => crypto.subtle.sign("HMAC", hkdf, Buffer.from(tokenId)),
      catch: (): AppError => ({
        errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
        message:
          "Could not calculate the signature for the account and token ID",
      }),
    }).pipe(
      Effect.map((signature) => Buffer.from(signature).toString("base64")),
    );
  });

const isSignatureValid = (
  accountId: string,
  tokenId: string,
  signature: string,
): Effect.Effect<boolean, AppError, ElevationServiceConfig> =>
  Effect.gen(function* () {
    const config = yield* ElevationServiceConfig;
    const hkdf = yield* Effect.tryPromise({
      try: () => calculateHkdf(config.ikm, DIGEST, accountId),
      catch: (): AppError => ({
        errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
        message: "Could not generate HKDF key for the account",
      }),
    });
    const isValid = yield* Effect.tryPromise({
      try: () =>
        crypto.subtle.verify(
          "HMAC",
          hkdf,
          Buffer.from(signature, "base64"),
          Buffer.from(tokenId),
        ),
      catch: (): AppError => {
        return {
          errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
          message: `Could not verify the signature authenticity`,
        };
      },
    });
    return isValid;
  });

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
  ) => Effect.Effect<Passport, AppError, ElevationServiceConfig>;
  readonly verify: (
    passport: Passport,
  ) => Effect.Effect<PassportValidation, AppError, ElevationServiceConfig>;
}
export const ElevationService =
  Context.GenericTag<ElevationService>("ElevationService");

export const ElevationServiceLive = Layer.effect(
  ElevationService,
  Effect.gen(function* () {
    const api = yield* AccountApi;
    const store = yield* ElevationStore;
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
                errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
                message: "Could not verify the solution due to a crypto error",
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
                errorCode:
                  ErrorCode.ERROR_AUTHENTICATION_BAD_CHALLENGE_SOLUTION,
                message:
                  "Wrong solution. Either the solution does not belong to the expected account, or the name of the token is not the expected one",
              }),
            ),
          );
          return yield* signElevation(
            challengeMetadata.accountId,
            challengeMetadata.tokenId,
          ).pipe(
            Effect.map(
              (signature): Passport => ({
                accountId: challengeMetadata.accountId,
                tokenId: challengeMetadata.tokenId,
                signature,
              }),
            ),
          );
        }),
      verify: (passport: Passport) =>
        Effect.gen(function* () {
          return {
            accountId: passport.accountId,
            tokenId: passport.tokenId,
            valid: yield* isSignatureValid(
              passport.accountId,
              passport.tokenId,
              passport.signature,
            ),
          };
        }),
    });
  }),
);
