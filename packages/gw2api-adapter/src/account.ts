import type { IAccountClient } from "@repo/game-api/account";
import { Endpoint, fetchApi } from "./common.js";
import { type Gw2ApiTokenInfo } from "@repo/contracts/gw2/v2";
import { AppErrorCode } from "@repo/contracts/error";

export const createAccountClient = (): IAccountClient => {
  let gw2Token: string | null = null;

  return {
    authenticate: (token) => (gw2Token = token),
    getTokenInfo: async () => {
      return await fetchApi<Gw2ApiTokenInfo>({
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
  };
};
