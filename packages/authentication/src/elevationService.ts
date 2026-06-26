import { timingSafeEqual } from "node:crypto";
import type { IAccountClient } from "@repo/game-api/account";
import { nanoid } from "nanoid";
import type { Account, Gw2ApiTokenInfo } from "@repo/contracts/gw2/v2";
import type {
  ChallengePuzzle,
  ChallengeSolution,
  ChallengeMetadata,
} from "@repo/contracts/api-gateway/elevation";
import type { ElevationStore } from "@repo/authentication-store/elevation-store";

interface ElevationService {
  challenge: (
    token: string,
    expirationSeconds: number,
  ) => Promise<ChallengePuzzle>;
  solve: (solution: ChallengeSolution) => Promise<string | false>;
}

interface ElevationServiceParams {
  accountApi: IAccountClient;
  store: ElevationStore;
  privateKey: string;
  publicKey: string;
  ikm: Buffer;
}

const createElevationService = (
  params: ElevationServiceParams,
): ElevationService => {
  const digest = "SHA-256";
  const apiKeyNamePrefix = "gwradar.com_verify_account_";
  const calculateHkdf = async (accountGuid: string) => {
    const encoder = new TextEncoder();
    const ikm = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(params.ikm),
      "HKDF",
      false,
      ["deriveKey"],
    );
    return await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: digest,
        salt: encoder.encode(accountGuid),
        info: encoder.encode("elevated-authentication"),
      },
      ikm,
      { name: "HMAC", hash: digest, length: 256 },
      false,
      ["sign"],
    );
  };
  const challenge = async (
    token: string,
    expirationSeconds: number = 300,
  ): Promise<ChallengePuzzle> => {
    const api = params.accountApi;
    api.authenticate(token);
    const [account, tokenInfo] = await Promise.all([
      api.getAccountInfo() as Promise<Account>,
      api.getTokenInfo() as Promise<Gw2ApiTokenInfo>,
    ]);
    const challenge: ChallengeMetadata = {
      id: nanoid(),
      accountId: account.id,
      tokenId: tokenInfo.id,
      test: `${apiKeyNamePrefix}${nanoid(8)}`,
    };
    await params.store.registerChallenge(challenge, expirationSeconds);
    return {
      id: challenge.id,
      test: challenge.test,
    };
  };
  const solve = async (solution: ChallengeSolution) => {
    try {
      const encoder = new TextEncoder();
      const challenge = await params.store.consumeChallenge(solution.id);
      const api = params.accountApi;
      api.authenticate(solution.solution);
      const [account, tokenInfo] = await Promise.all([
        api.getAccountInfo() as Promise<Account>,
        api.getTokenInfo() as Promise<Gw2ApiTokenInfo>,
      ]);
      const validations: [Buffer, Buffer][] = [
        [
          Buffer.from(
            await crypto.subtle.digest(
              digest,
              encoder.encode(challenge.accountId),
            ),
          ),
          Buffer.from(
            await crypto.subtle.digest(digest, encoder.encode(account.id)),
          ),
        ],
        [
          Buffer.from(
            await crypto.subtle.digest(digest, encoder.encode(challenge.test)),
          ),
          Buffer.from(
            await crypto.subtle.digest(digest, encoder.encode(tokenInfo.name)),
          ),
        ],
      ];
      const validated = validations.reduce(
        (acc: boolean, cur: [Buffer, Buffer]) => {
          const matches = timingSafeEqual(cur[0], cur[1]);
          return acc && matches;
        },
        true,
      );
      if (!validated) {
        return false;
      }
      const signingKey = await calculateHkdf(challenge.accountId);
      return Buffer.from(
        await crypto.subtle.sign(
          "HMAC",
          signingKey,
          Buffer.from(challenge.tokenId),
        ),
      ).toString("base64");
    } catch {
      return false;
    }
  };
  return { challenge, solve };
};

export {
  type ElevationService,
  type ElevationServiceParams,
  createElevationService,
};
