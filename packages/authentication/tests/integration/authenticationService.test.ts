import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { AuthenticationService } from "../../src/authenticationService.js";
import { TestEnvironment } from "../mocks.js";

describe("Authentication service", () => {
  it("should authenticate a user", async () => {
    const program = Effect.gen(function* () {
      const authenticationService = yield* AuthenticationService;
      return yield* authenticationService.authenticate("00000");
    });

    const token = await Effect.runPromise(
      program.pipe(Effect.provide(TestEnvironment)),
    );

    expect(token).toEqual({
      jwt: expect.any(String),
    });
  });
});
