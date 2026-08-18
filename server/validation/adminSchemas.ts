import { z } from "zod";

// "superadmin" n'est jamais accepté ici : ce rôle ne se distribue que via le
// script de bootstrap (cf. server/scripts/setSuperAdmin.ts), jamais par API.
export const setRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

export type SetRoleInput = z.infer<typeof setRoleSchema>;
