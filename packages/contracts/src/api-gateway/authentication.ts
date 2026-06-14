import { z } from "zod";
import {
  BaseErrorApiResponseSchema,
  BaseSuccessResponseSchema,
} from "./response-common.js";

/**
 * Levels of authentication
 */
const AuthenticationLevel = {
  /** The client has been authenticated using a key that has not been verified. */
  Authenticated: 0,
  /** The client has been authenticated using a verified key that demonstrates ownership. */
  Verified: 1,
} as const;

/**
 * Levels of authentication.
 */
const AuthenticationLevelEnum = z
  .enum(AuthenticationLevel)
  .describe("Authentication levels");
/**
 * Levels of authentication.
 */
type AuthenticationLevelEnum = z.infer<typeof AuthenticationLevelEnum>;

/**
 * List of properties that an authentication badge (JWT or cookie) contains.
 */
const AuthenticationAttributesSchema = z.object({
  /** Comma-separated list of character names. */
  chl: z
    .string()
    .regex(/^\p{Lu}\p{Ll}*(?:[\s,]\p{Lu}\p{Ll}*)*$/u)
    .describe("Comma-separated list of character names"),
  aut: AuthenticationLevelEnum,
});
/**
 * List of properties that an authentication badge (JWT or cookie) contains.
 */
type AuthenticationAttributes = z.infer<typeof AuthenticationAttributesSchema>;

/**
 * Schema that supports and validates Guild Wars 2 API key subtokens.
 * @see [GW2 API subtoken creation]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}.
 */
const PostAuthenticateRequestSchema = z
  .object({
    /** GW2 API token, either a key or a subtoken */
    gw2token: z
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
  })
  .describe("Authentication payload for Guild Wars 2 subtokens");

/**
 * Schema that supports and validates Guild Wars 2 API key subtokens.
 * @see [GW2 API subtoken creation]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}.
 */
type PostAuthenticateRequest = z.infer<typeof PostAuthenticateRequestSchema>;

const PostAuthenticateResponseSchema = z.discriminatedUnion("status", [
  BaseSuccessResponseSchema.extend({
    token: z.jwt().describe("JWT token for authenticating against the ws"),
  }),
  BaseErrorApiResponseSchema,
]);

/**
 * Schema that validates the POST authentication response from the API.
 */
type PostAuthenticateResponse = z.infer<typeof PostAuthenticateResponseSchema>;

export {
  AuthenticationLevel,
  AuthenticationLevelEnum,
  AuthenticationAttributesSchema,
  PostAuthenticateRequestSchema,
  PostAuthenticateResponseSchema,
  type AuthenticationAttributes,
  type PostAuthenticateRequest,
  type PostAuthenticateResponse,
};
