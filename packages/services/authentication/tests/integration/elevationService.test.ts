import { describe, expect, it } from "vitest";
import { ElevationService } from "../../src/elevationService.ts";
import { TestEnvironment } from "../mocks.ts";
import { Effect } from "effect";

describe("Elevation service", () => {
  it("should create and return a challenge", async () => {
    const program = Effect.gen(function* () {
      const elevationService = yield* ElevationService;
      return yield* elevationService.challenge("token-test", 300);
    });

    const challenge = await Effect.runPromise(
      program.pipe(Effect.provide(TestEnvironment)),
    );
    expect(challenge).toHaveProperty("test");
  });
  it("should verify the solution of the challenge", async () => {
    const program = Effect.gen(function* () {
      const elevationService = yield* ElevationService;
      return yield* elevationService.solve({
        id: "00000",
        solution: "token-test",
      });
    });

    const signature = await Effect.runPromise(
      program.pipe(Effect.provide(TestEnvironment)),
    );
    expect(signature).toEqual({
      accountId: "00000000-0000-0000-0000-000000000000",
      tokenId: "00000000-0000-0000-0000-000000000000",
      signature: expect.stringMatching(/^[A-Za-z0-9+/]+={0,2}$/),
    });
  });
});
