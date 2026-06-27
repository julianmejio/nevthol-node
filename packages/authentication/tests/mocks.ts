import { AccountApi } from "@repo/game-api/account";
import { vi } from "vitest";
import { type ChallengeMetadata } from "@repo/contracts/api-gateway/elevation";
import { Effect, Layer } from "effect";
import type { Account, CharacterList, TokenInfo } from "@repo/contracts/gw2/v2";
import { ElevationStore } from "@repo/authentication-store/elevation-store";
import {
  ElevationServiceConfig,
  ElevationServiceLive,
} from "../src/elevationService.js";

export const createMockAccountApi = (
  overrides?: Partial<AccountApi>,
): AccountApi => {
  return {
    getAccount: vi
      .fn()
      .mockReturnValue(
        Effect.succeed<Account>({ id: "00000000-0000-0000-0000-000000000000" }),
      ),
    getTokenInfo: vi.fn().mockReturnValue(
      Effect.succeed<TokenInfo>({
        id: "00000000-0000-0000-0000-000000000000",
        name: "challenge-value",
        permissions: ["account", "characters"],
      }),
    ),
    getCharacters: vi
      .fn()
      .mockReturnValue(
        Effect.succeed<CharacterList>(["Character 1", "Character 2"]),
      ),
    ...overrides,
  };
};

export const createMockStore = (): ElevationStore => {
  return {
    registerChallenge: vi.fn().mockReturnValue(Effect.void),
    consumeChallenge: vi.fn().mockReturnValue(
      Effect.succeed<ChallengeMetadata>({
        id: "00000",
        accountId: "00000000-0000-0000-0000-000000000000",
        tokenId: "00000000-0000-0000-0000-000000000000",
        test: "challenge-value",
      }),
    ),
  };
};

export const MockAccountApiLayer = Layer.succeed(
  AccountApi,
  createMockAccountApi(),
);
export const MockElevationStoreLayer = Layer.succeed(
  ElevationStore,
  createMockStore(),
);
export const MockElevationConfigLayer = Layer.succeed(ElevationServiceConfig, {
  ikm: Buffer.from("PAcR9G2CbwEC2GJMjtwCmE82uXxJ06YUUSUAYK64ATM=", "base64"),
});

const MockDependencies = Layer.mergeAll(
  MockAccountApiLayer,
  MockElevationStoreLayer,
  MockElevationConfigLayer,
);

export const TestEnvironment = ElevationServiceLive.pipe(
  Layer.provide(MockDependencies),
);
