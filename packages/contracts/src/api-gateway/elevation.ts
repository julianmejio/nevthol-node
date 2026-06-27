import { z } from "zod";

/**
 * TODO: Make elevation process
 * # Elevation process
 *
 * This process elevates a user/key by authenticating using a challenge
 *
 * 1. Client: Sends subtoken to elevate
 * 2. System: Retrieves account GUID and token ID associated to the subtoken
 * 3. System: Creates a signed JWT including the account GUID, token ID, and a challenge consisting in creating an API key with a specific name for being sent as a response
 * 4. Client: Creates the API key with the specified name as a response to the challenge in external platform.
 * 5. Client: Sends the API key with the associated name in a request, using the JWT token in step 3 as the authentication header
 * 6. System: Once verified the JWT, retrieves the name of the API key matches the one in the store against the one in the external service, and also with the account GUID
 * 7. System: Generates a HKDF with the secret, salt as account, and info as the subtoken on step 1. and then signs the originating token ID
 */

/**
 * X
 */
export const PostElevationRequestSchema = z.object({
  token: z
    .union([
      z
        .jwt({ error: "JWT Token is malformed" })
        .describe("Guild Wars 2 subtoken"),
      z
        .string({ error: "Token is malformed" })
        .regex(/^([0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}){2}$/i)
        .describe("Guild Wars 2 token"),
    ])
    .describe("Guild Wars 2 token or subtoken"),
});
export type PostElevationRequest = z.infer<typeof PostElevationRequestSchema>;

export const PostElevationResponseSchema = z.object({
  challengeJwt: z.jwt(),
});
export type PostElevationResponse = z.infer<typeof PostElevationResponseSchema>;

export const PostChallengeResponseRequestSchema =
  PostElevationResponseSchema.extend({
    response: z.object({
      token: z
        .union([
          z
            .jwt({ error: "JWT Token is malformed" })
            .describe("Guild Wars 2 subtoken"),
          z
            .string({ error: "Token is malformed" })
            .regex(/^([0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}){2}$/i)
            .describe("Guild Wars 2 token"),
        ])
        .describe("Guild Wars 2 token or subtoken"),
    }),
  });
export type PostChallengeResponseRequest = z.infer<
  typeof PostChallengeResponseRequestSchema
>;

export const PostChallengeResponseResponseSchema = z.object({
  elevationToken: z.base64(),
});
export type PostChallengeResponseResponse = z.infer<
  typeof PostChallengeResponseResponseSchema
>;
export const ChallengeMetadataSchema = z.object({
  id: z.string(),
  accountId: z.guid(),
  tokenId: z.guid(),
  test: z.string(),
});
export type ChallengeMetadata = z.infer<typeof ChallengeMetadataSchema>;
export const ChallengePuzzleSchema = ChallengeMetadataSchema.pick({
  id: true,
  test: true,
});
export type ChallengePuzzle = z.infer<typeof ChallengePuzzleSchema>;
export const ChallengeSolutionSchema = ChallengeMetadataSchema.pick({
  id: true,
}).extend({
  solution: z.jwt(),
});
export type ChallengeSolution = z.infer<typeof ChallengeSolutionSchema>;
