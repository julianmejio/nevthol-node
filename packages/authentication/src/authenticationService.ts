import { AccountApi } from "@repo/game-api/account";
import {
  type AuthenticationClaimSet,
  AuthenticationLevel,
  type AuthenticationLevelEnum,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { type AppError, ErrorCode } from "@repo/contracts/error";
import { Context, Effect, Layer } from "effect";
import {
  ElevationService,
  type ElevationServiceConfig,
} from "./elevationService.js";
import type { Passport } from "@repo/contracts/api-gateway/elevation";

const JWT_EXPIRATION_SPAN = "10s";

const getAuthenticationLevel = (
  passport: Passport,
): Effect.Effect<
  AuthenticationLevelEnum,
  AppError,
  ElevationService | ElevationServiceConfig
> =>
  Effect.gen(function* () {
    const elevationService = yield* ElevationService;
    return yield* elevationService.verify(passport).pipe(
      Effect.map((result) =>
        result.valid
          ? AuthenticationLevel.Verified
          : AuthenticationLevel.Authenticated,
      ),
      Effect.mapError(
        (): AppError => ({
          errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
          message:
            "Could not verify the elevation signature during authentication",
        }),
      ),
    );
  });

const getAuthenticationLevelByToken = (
  token: string,
  signature: string,
): Effect.Effect<
  AuthenticationLevelEnum,
  AppError,
  ElevationService | AccountApi | ElevationServiceConfig
> =>
  Effect.gen(function* () {
    const api = yield* AccountApi;
    const [account, tokenInfo] = yield* Effect.all([
      api.getAccount(token),
      api.getTokenInfo(token),
    ]);
    return yield* getAuthenticationLevel({
      accountId: account.id,
      tokenId: tokenInfo.id,
      signature,
    });
  });

export interface AuthenticationServiceConfig {
  privateKey?: string;
  publicKey?: string;
}
export const AuthenticationServiceConfig =
  Context.GenericTag<AuthenticationServiceConfig>(
    "AuthenticationServiceConfig",
  );

export interface AuthenticationService {
  readonly authenticate: (
    token: string,
    elevationToken: string | undefined,
  ) => Effect.Effect<
    PostAuthenticateResponse,
    AppError,
    ElevationService | ElevationServiceConfig | AccountApi
  >;
}
export const AuthenticationService = Context.GenericTag<AuthenticationService>(
  "AuthenticationService",
);

export const AuthenticationServiceLive = Layer.effect(
  AuthenticationService,
  Effect.gen(function* () {
    const config = yield* AuthenticationServiceConfig;
    const api = yield* AccountApi;
    return {
      authenticate: (
        token: string,
        elevationToken: string | undefined = undefined,
      ) =>
        Effect.gen(function* () {
          const privateKey = yield* Effect.fromNullable(config.privateKey).pipe(
            Effect.mapError(
              (): AppError => ({
                errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
                message: "No private key provided for JWT signing",
              }),
            ),
          );
          const [characters, authenticationLevel] = yield* Effect.all(
            [
              api.getCharacters(token).pipe(
                Effect.mapError(
                  (): AppError => ({
                    errorCode: ErrorCode.ERROR_AUTHENTICATION_BAD_CREDENTIAL,
                    message:
                      'Could not retrieve the list of characters. Check that the token provided has the "characters" permission',
                  }),
                ),
              ),
              getAuthenticationLevelByToken(token, String(elevationToken)),
            ],
            { concurrency: "unbounded" },
          );
          const claimSet: AuthenticationClaimSet = {
            aut: authenticationLevel,
            chl: characters.join(","),
          };
          const authToken = jwt.sign(claimSet, privateKey, {
            expiresIn: JWT_EXPIRATION_SPAN,
            algorithm: "ES256",
            jwtid: nanoid(14),
          });
          return {
            jwt: authToken,
            claim: claimSet,
          };
        }),
    };
  }),
);
