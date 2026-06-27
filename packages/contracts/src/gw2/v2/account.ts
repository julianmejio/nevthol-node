import { z } from "zod";

export const AccountSchema = z.object({
  id: z.guid(),
});
export type Account = z.infer<typeof AccountSchema>;

export const CharacterListSchema = z.array(z.string());
export type CharacterList = z.infer<typeof CharacterListSchema>;
