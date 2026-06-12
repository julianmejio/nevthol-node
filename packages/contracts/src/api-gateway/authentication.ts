import { z } from "zod";
import { AppErrorSchema } from "../error.js";
import {
  BaseErrorApiResponseSchema,
  BaseSuccessResponseSchema,
} from "./response-common.js";

/**
 * Schema that supports and validates Guild Wars 2 API key subtokens.
 * @see [GW2 API subtoken creation]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}.
 */
export const PostAuthenticateRequestSchema = z
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
export type PostAuthenticateRequest = z.infer<
  typeof PostAuthenticateRequestSchema
>;

export const PostAuthenticateResponseSchema = z.discriminatedUnion("status", [
  BaseSuccessResponseSchema.extend({
    token: z.jwt().describe("JWT token for authenticating against the ws"),
  }),
  BaseErrorApiResponseSchema,
]);

/**
 * Schema that validates the POST authentication response from the API.
 */
export type PostAuthenticateResponse = z.infer<
  typeof PostAuthenticateResponseSchema
>;
