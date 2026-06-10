import type { IAccountClient } from "@repo/game-api/account";
import {
  type PostAuthenticateRequest,
  PostAuthenticateRequestSchema,
  type PostAuthenticateResponse,
} from "@repo/contracts/api-gateway/authentication";
import { type AppError, AppErrorCode } from "@repo/contracts/error";
import { Gw2ApiTokenInfoSchema } from "@repo/contracts/gw2/v2";
import jwt, { type SignOptions } from "jsonwebtoken";
import { nanoid } from "nanoid";
import type { IConnectionStore } from "@repo/session/connection";

interface IAuthenticationService {
  getAuthenticationJwtByGw2ApiKey: (
    request: PostAuthenticateRequest,
    privateKey: string,
    metaDataJwt?: Partial<Pick<SignOptions, "issuer" | "audience" | "subject">>,
  ) => Promise<PostAuthenticateResponse | AppError>;
  isValidGw2Token: (gw2Token: string) => Promise<boolean>;
  getCharacterList: (gw2Token: string) => Promise<string[] | null>;
  signJwt: <T extends object>(
    privateKey: string,
    contents: T,
    options: Omit<SignOptions, "algorithm">,
  ) => string | null;
}

const createAuthenticationService = (
  accountClient: IAccountClient,
  connectionStore: IConnectionStore,
): IAuthenticationService => {
  const isValidGw2Token = async (gw2Token: string) => {
    try {
      accountClient.authenticate(gw2Token);
      const tokenInformation = await accountClient.getTokenInfo();
      const result = Gw2ApiTokenInfoSchema.safeParse(tokenInformation);
      return result.success;
    } catch {
      return false;
    }
  };
  const getCharacterList = async (
    gw2Token: string,
  ): Promise<string[] | null> => {
    try {
      accountClient.authenticate(gw2Token);
      const characterList = await accountClient.getAllCharacters();
      if (!Array.isArray(characterList)) {
        return null;
      }
      return characterList;
    } catch {
      return null;
    }
  };
  const signJwt = <T extends object>(
    privateKey: string,
    payload: T,
    options: Omit<SignOptions, "algorithm"> = {},
  ): string | null => {
    const defaultOptions: SignOptions = {
      expiresIn: "10s",
      notBefore: 0,
      jwtid: nanoid(14),
    };
    try {
      return jwt.sign(payload, privateKey, {
        ...defaultOptions,
        ...options,
        ...({ algorithm: "ES256" } as SignOptions),
      });
    } catch {
      return null;
    }
  };
  return {
    isValidGw2Token: (gw2Token: string) => isValidGw2Token(gw2Token),
    getCharacterList: (gw2Token: string) => getCharacterList(gw2Token),
    signJwt: <T extends object>(
      privateKey: string,
      payload: T,
      options: Omit<SignOptions, "algorithm"> = {},
    ) => signJwt<T>(privateKey, payload, options),
    getAuthenticationJwtByGw2ApiKey: async (
      request: PostAuthenticateRequest,
      privateKey: string,
      metaDataJwt: Partial<
        Pick<SignOptions, "issuer" | "audience" | "subject">
      > = {},
    ): Promise<PostAuthenticateResponse | AppError> => {
      const requestValidation =
        PostAuthenticateRequestSchema.safeParse(request);
      if (!requestValidation.success) {
        console.debug(requestValidation.error);
        return {
          errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
          message: "Authentication request is malformed",
        };
      }
      if (!(await isValidGw2Token(requestValidation.data.gw2token))) {
        return {
          errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
          message: "Token is not valid",
        };
      }
      const characterList = await getCharacterList(
        requestValidation.data.gw2token,
      );
      if (null === characterList) {
        return {
          errorCode: AppErrorCode.GW2_ACCOUNT_INVALID_CHARACTER_LIST,
          message:
            "No valid character list (or no characters at all) have been found. Have you forgotten 'characters' permission? Try with an account with at least one character",
        };
      }
      try {
        const connectionId = nanoid(10);
        const jwt = signJwt(
          privateKey,
          {},
          { ...metaDataJwt, jwtid: connectionId },
        );
        if (null === jwt) {
          return {
            errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
            message: "Could not generate an authentication token",
          };
        }
        await connectionStore.setAllowedCharacters(connectionId, characterList);
        await connectionStore.expire(connectionId, 15);
        return {
          status: "success",
          token: jwt,
        };
      } catch {
        return {
          errorCode: AppErrorCode.AUTHENTICATION_GENERIC_ERROR,
          message: "An error occurred when tried to authenticate the user",
        };
      }
    },
  };
};

export { createAuthenticationService };
