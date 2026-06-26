import { z } from "zod";

const AccountSchema = z.object({
  id: z.guid(),
});
type Account = z.infer<typeof AccountSchema>;

export { AccountSchema, type Account };
