import type { ChallengeMetadata } from "@repo/contracts/api-gateway/elevation";

interface ElevationStore {
  registerChallenge: (
    challenge: ChallengeMetadata,
    expirationSeconds: number,
  ) => Promise<void>;
  consumeChallenge: (challengeId: string) => Promise<ChallengeMetadata>;
}

export { type ElevationStore };
