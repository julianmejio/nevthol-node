import { IAccountClient } from "@repo/game-api/account";
import { vi } from "vitest";
import { ElevationStore } from "@repo/authentication-store/elevation-store";
import { ChallengeMetadata } from "@repo/contracts/api-gateway/elevation";

const createMockAccountApi = (
  overrides?: Partial<IAccountClient>,
): IAccountClient => {
  return {
    authenticate: vi.fn(),
    getAccountInfo: vi
      .fn()
      .mockResolvedValue({ id: "00000000-0000-0000-0000-000000000000" }),
    getTokenInfo: vi.fn().mockReturnValue({
      id: "00000000-0000-0000-0000-000000000000",
      name: "challenge-value",
    }),
    getAllCharacters: vi.fn().mockReturnValue(["Character A"]),
    ...overrides,
  };
};

const createMockStore = (): ElevationStore => {
  return {
    registerChallenge: vi.fn(),
    consumeChallenge: vi.fn().mockResolvedValue({
      id: "00000",
      accountId: "00000000-0000-0000-0000-000000000000",
      tokenId: "00000000-0000-0000-0000-000000000000",
      test: "challenge-value",
    } as ChallengeMetadata),
  };
};

export { createMockAccountApi, createMockStore };
