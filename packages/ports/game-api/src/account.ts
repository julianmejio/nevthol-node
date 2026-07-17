import type { Account, CharacterList, TokenInfo } from "@repo/contracts/gw2/v2";
import type { AppError } from "@repo/contracts/error";
import { Effect, Context } from "effect";

export interface IAccountClient {
  authenticate: (token: string) => void;
  getAccountInfo: () => Promise<Account | AppError>;
  getTokenInfo: () => Promise<TokenInfo | AppError>;
  getAllCharacters: () => Promise<string[] | AppError>;
}

export interface AccountApi {
  readonly getAccount: (token: string) => Effect.Effect<Account, AppError>;
  readonly getTokenInfo: (token: string) => Effect.Effect<TokenInfo, AppError>;
  readonly getCharacters: (
    token: string,
  ) => Effect.Effect<CharacterList, AppError>;
}

export const AccountApi = Context.GenericTag<AccountApi>("AccountApi");
