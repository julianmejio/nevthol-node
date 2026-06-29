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
import {
  AuthenticationServiceConfig,
  AuthenticationServiceLive,
} from "../src/authenticationService.js";

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

export const MockAuthenticationConfigLayer = Layer.succeed(
  AuthenticationServiceConfig,
  {
    privateKey:
      "-----BEGIN EC PRIVATE KEY-----\n" +
      "MHcCAQEEINcU/uurc/AiZegj0tMLM9Qi6APdzLY4dehUqDVgUjhqoAoGCCqGSM49\n" +
      "AwEHoUQDQgAEmb8TnUzXtz8i56Kk/p+96LyqyOo5L7na6MkpIZfukTFv6ka0NsmY\n" +
      "SgkvXfBgSo6M1ACUi1xgt5yPifEBGL1P/g==\n" +
      "-----END EC PRIVATE KEY-----",
  },
);

const MockDependencies = Layer.mergeAll(
  MockAccountApiLayer,
  MockElevationStoreLayer,
  MockElevationConfigLayer,
  MockAuthenticationConfigLayer,
);

const Services = Layer.mergeAll(
  ElevationServiceLive,
  AuthenticationServiceLive,
);

export const TestEnvironment = Services.pipe(Layer.provide(MockDependencies));
