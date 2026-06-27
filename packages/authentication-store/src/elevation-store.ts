import type { ChallengeMetadata } from "@repo/contracts/api-gateway/elevation";
import { Effect, Context } from "effect";
import { type AppError } from "@repo/contracts/error";

export interface ElevationStore {
  readonly registerChallenge: (
    challenge: ChallengeMetadata,
    expirationSeconds: number,
  ) => Effect.Effect<void, AppError>;
  consumeChallenge: (
    challengeId: string,
  ) => Effect.Effect<ChallengeMetadata, AppError>;
}
export const ElevationStore =
  Context.GenericTag<ElevationStore>("ElevationStore");
