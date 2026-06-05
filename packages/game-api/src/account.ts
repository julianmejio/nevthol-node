import type { Gw2ApiTokenInfo } from "@repo/contracts/gw2/v2";
import type { AppError } from "@repo/contracts/error";

export interface IAccountClient {
  authenticate: (token: string) => void;
  getTokenInfo: () => Promise<Gw2ApiTokenInfo | AppError>;
  getAllCharacters: () => Promise<string[] | AppError>;
}
