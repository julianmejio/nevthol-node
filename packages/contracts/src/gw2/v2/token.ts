import { z } from "zod";

// GW2 APi scopes

/**
 * Schema with a list of possible GW2 API permissions.
 */
export const Gw2ApiScopesSchema = z.enum([
  "account",
  "builds",
  "characters",
  "guilds",
  "inventories",
  "progression",
  "pvp",
  "tradingpost",
  "unlocks",
  "wallet",
]);

/**
 * List of possible GW2 API permissions.
 */
export type Gw2ApiScopes = z.infer<typeof Gw2ApiScopesSchema>;

/**
 * Schema for validating [/tokeninfo]{@link https://wiki-en.guildwars2.com/wiki/API:2/tokeninfo} responses.
 * @see GW2 [/createsubtoken]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}
 * @see GW2 [API key]{@link https://wiki.guildwars2.com/wiki/API:API_key}
 * @todo Move it to contracts package.
 */
export const Gw2ApiTokenInfoSchema = z.object({
  /** The first half of the API key that was requested. */
  id: z
    .string({ error: "Token ID is not present" })
    .pipe(
      z.union([z.uuid({ version: "v4" }), z.jwt()], {
        error: "Token ID is invalid",
      }),
    )
    .describe("The first half of the API key that was requested"),
  /** The name given to the API key by the account owner. Warning: The value of this field is not escaped and may contain valid HTML, JavaScript, other code. Handle with care. */
  name: z
    .string({ error: "Token name is not present" })
    .describe(
      "The name given to the API key by the account owner. Warning: The value of this field is not escaped and may contain valid HTML, JavaScript, other code. Handle with care",
    ),
  /**
   * Array describing which permissions the API key has.
   */
  permissions: z
    .array(Gw2ApiScopesSchema)
    .describe("Array of strings describing which permissions the API key has"),
});

/**
 * [/tokeninfo]{@link https://wiki-en.guildwars2.com/wiki/API:2/tokeninfo} endpoint response
 * @see GW2 [/createsubtoken]{@link https://wiki.guildwars2.com/wiki/API:2/createsubtoken}
 * @see GW2 [API key]{@link https://wiki.guildwars2.com/wiki/API:API_key}
 */
export type Gw2ApiTokenInfo = z.infer<typeof Gw2ApiTokenInfoSchema>;
