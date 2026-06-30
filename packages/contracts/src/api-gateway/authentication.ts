import { z } from "zod";

/**
 * Levels of authentication
 */
export const AuthenticationLevel = {
  /** The client has been authenticated using a key that has not been verified. */
  Authenticated: 0,
  /** The client has been authenticated using a verified key that demonstrates ownership. */
  Verified: 1,
} as const;

/**
 * Levels of authentication.
 */
export const AuthenticationLevelEnumSchema = z
  .enum(AuthenticationLevel)
  .describe("Authentication levels");
/**
 * Levels of authentication.
 */
export type AuthenticationLevelEnum = z.infer<
  typeof AuthenticationLevelEnumSchema
>;

/**
 * List of properties that an authentication badge (JWT or cookie) contains.
 */
export const AuthenticationClaimSetSchema = z.object({
  /** Comma-separated list of character names. */
  chl: z
    .string()
    .regex(/^\p{Lu}\p{Ll}*(?:[\s,]\p{Lu}\p{Ll}*)*$/u)
    .describe("Comma-separated list of character names"),
  aut: AuthenticationLevelEnumSchema,
});
/**
 * List of properties that an authentication badge (JWT or cookie) contains.
 */
export type AuthenticationClaimSet = z.infer<
  typeof AuthenticationClaimSetSchema
>;

/**
 * Schema that supports and validates Guild Wars 2 API key subtokens.
 * @see [GW2 API subtoken creation]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}.
 */
export const PostAuthenticateRequestSchema = z
  .object({
    /** GW2 API token, either a key or a subtoken */
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
    elevationToken: z
      .base64()
      .optional()
      .describe(
        "Token that allows the elevation of the session. If valid, it gives full access to the system with the specified account",
      ),
  })
  .describe("Authentication payload for Guild Wars 2 subtokens");

/**
 * Schema that supports and validates Guild Wars 2 API key subtokens.
 * @see [GW2 API subtoken creation]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}.
 */
export type PostAuthenticateRequest = z.infer<
  typeof PostAuthenticateRequestSchema
>;

export const PostAuthenticateResponseSchema = z.object({
  jwt: z.jwt(),
  claim: AuthenticationClaimSetSchema,
});

/**
 * Schema that validates the POST authentication response from the API.
 */
export type PostAuthenticateResponse = z.infer<
  typeof PostAuthenticateResponseSchema
>;
