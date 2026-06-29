import { AccountApi } from "@repo/game-api/account";
import {
  type AuthenticationClaimSet,
  AuthenticationLevel,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { type AppError, ErrorCode } from "@repo/contracts/error";
import { Context, Effect, Layer } from "effect";

const JWT_EXPIRATION_SPAN = "10s";

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
  ) => Effect.Effect<PostAuthenticateResponse, AppError, never>;
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
      authenticate: (token: string) =>
        Effect.gen(function* () {
          const privateKey = yield* Effect.fromNullable(config.privateKey).pipe(
            Effect.mapError(
              (): AppError => ({
                errorCode: ErrorCode.ERROR_COULD_NOT_FINISH_CRYPTO,
                message: "No private key provided for JWT signing",
              }),
            ),
          );
          const characters = yield* api.getCharacters(token).pipe(
            Effect.mapError(
              (): AppError => ({
                errorCode: ErrorCode.ERROR_AUTHENTICATION_BAD_CREDENTIAL,
                message:
                  'Could not retrieve the list of characters. Check that the token provided has the "characters" permission',
              }),
            ),
          );
          const claimSet: AuthenticationClaimSet = {
            // TODO: Verify authentication signature
            aut: AuthenticationLevel.Authenticated,
            chl: characters.join(","),
          };
          const authToken = jwt.sign(claimSet, privateKey, {
            expiresIn: JWT_EXPIRATION_SPAN,
            algorithm: "ES256",
            jwtid: nanoid(14),
          });
          return {
            jwt: authToken,
          };
        }),
    };
  }),
);
