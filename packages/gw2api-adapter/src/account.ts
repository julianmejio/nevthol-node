import { AccountApi, type IAccountClient } from "@repo/game-api/account";
import { Endpoint, fetchApi } from "./common.js";
import {
  type Account,
  AccountSchema,
  type CharacterList,
  CharacterListSchema,
  type ErrorResponse,
  type TokenInfo,
  TokenInfoSchema,
} from "@repo/contracts/gw2/v2";
import {
  type AppError,
  AppErrorCode,
  type AppErrorCodeEnum,
} from "@repo/contracts/error";
import { Effect, Layer } from "effect";

const failWithNetworkError = (message: string, errorCode: AppErrorCodeEnum) =>
  Effect.fail<AppError>({
    errorCode,
    message,
  });

export const createAccountClient = (): IAccountClient => {
  let gw2Token: string | null = null;

  return {
    authenticate: (token) => (gw2Token = token),
    getTokenInfo: async () => {
      return await fetchApi<TokenInfo>({
        endpointConfiguration: {
          endpoint: Endpoint.TokenInfo,
          parameters: null,
        },
        authorizationToken: gw2Token as string,
        gw2ErrorCode: AppErrorCode.GW2_API_ERROR,
      });
    },
    getAllCharacters: async () => {
      return await fetchApi<string[]>({
        endpointConfiguration: {
          endpoint: Endpoint.Characters,
          parameters: null,
        },
        authorizationToken: gw2Token as string,
      });
    },
    getAccountInfo: async () => {
      return await fetchApi<Account>({
        endpointConfiguration: {
          endpoint: Endpoint.Account,
          parameters: null,
        },
        authorizationToken: gw2Token as string,
      });
    },
  };
};

export const AccountApiLive = Layer.succeed(
  AccountApi,
  AccountApi.of({
    getAccount: (token: string) =>
      Effect.tryPromise({
        try: () =>
          fetchApi<Account>({
            endpointConfiguration: {
              endpoint: Endpoint.Account,
              parameters: null,
            },
            authorizationToken: token,
          }),
        catch: (error: unknown): AppError => ({
          errorCode: AppErrorCode.GW2_API_ERROR,
          message: (error as ErrorResponse)?.text || "Unknown error",
        }),
      }).pipe(
        Effect.flatMap((response) => {
          const parsed = AccountSchema.safeParse(response);
          if (!parsed.success) {
            return failWithNetworkError(
              parsed.error.message,
              AppErrorCode.GW2_API_ERROR,
            );
          }
          return Effect.succeed(parsed.data);
        }),
      ),
    getTokenInfo: (token: string) =>
      Effect.tryPromise({
        try: () =>
          fetchApi<TokenInfo>({
            endpointConfiguration: {
              endpoint: Endpoint.TokenInfo,
              parameters: null,
            },
            authorizationToken: token,
          }),
        catch: (error: unknown): AppError => ({
          errorCode: AppErrorCode.GW2_API_ERROR,
          message: (error as ErrorResponse)?.text || "Unknown error",
        }),
      }).pipe(
        Effect.flatMap((response) => {
          const parsed = TokenInfoSchema.safeParse(response);
          if (!parsed.success) {
            return failWithNetworkError(
              parsed.error.message,
              AppErrorCode.GW2_API_ERROR,
            );
          }
          return Effect.succeed(parsed.data);
        }),
      ),
    getCharacters: (token: string) =>
      Effect.tryPromise({
        try: () =>
          fetchApi<CharacterList>({
            endpointConfiguration: {
              endpoint: Endpoint.Characters,
              parameters: null,
            },
            authorizationToken: token,
          }),
        catch: (error: unknown): AppError => ({
          errorCode: AppErrorCode.GW2_API_ERROR,
          message: (error as ErrorResponse)?.text || "Unknown error",
        }),
      }).pipe(
        Effect.flatMap((response) => {
          const parsed = CharacterListSchema.safeParse(response);
          if (!parsed.success) {
            return failWithNetworkError(
              parsed.error.message,
              AppErrorCode.GW2_API_ERROR,
            );
          }
          return Effect.succeed(parsed.data);
        }),
      ),
  }),
);
