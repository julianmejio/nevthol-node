import { z } from "zod";
import { AppErrorSchema } from "../error.js";

/**
 * Schema that supports and validates Guild Wars 2 API key subtokens.
 * @see [GW2 API subtoken creation]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}.
 * @todo Move it to contracts package
 */
export const PostAuthenticateRequestSchema = z
  .object({
    /** GW2 API subtoken. */
    gw2token: z
      .union([
        z
          .jwt({ error: "JWT Token is malformed" })
          .describe("Guild Wars 2 subtoken"),
        z
          .string({ error: "Token is malformed" })
          .regex(
            /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}){2}$/i,
          )
          .describe("Guild Wars 2 token"),
      ])
      .describe("Guild Wars 2 token or subtoken"),
  })
  .describe("Authentication payload for Guild Wars 2 subtokens");

/**
 * Successful authentication response.
 */
const PostAuthenticateResponseSchema = z.union([
  z
    .object({
      /** Status of the response. */
      status: z
        .literal("success")
        .describe(
          "`status: success` indicating a successful authentication response",
        ),
      /** JWT token to be used for authentication. */
      token: z
        .jwt()
        .describe("JWT token to be used for authenticating against the system"),
    })
    .describe("Successful authentication response"),
  AppErrorSchema,
]);

export type PostAuthenticateResponse = z.infer<
  typeof PostAuthenticateResponseSchema
>;
