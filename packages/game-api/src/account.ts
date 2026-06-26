import type { Account, Gw2ApiTokenInfo } from "@repo/contracts/gw2/v2";
import type { AppError } from "@repo/contracts/error";

export interface IAccountClient {
  authenticate: (token: string) => void;
  getAccountInfo: () => Promise<Account | AppError>;
  getTokenInfo: () => Promise<Gw2ApiTokenInfo | AppError>;
  getAllCharacters: () => Promise<string[] | AppError>;
}
