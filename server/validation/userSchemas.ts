import { z } from "zod";

// Les mots de passe sont hashés en bcrypt, qui ignore tout au-delà de 72
// octets : on borne explicitement plutôt que de tronquer en silence.
const password = z.string().min(8, "Le mot de passe doit faire au moins 8 caractères.").max(72);

const username = z
  .string()
  .trim()
  .min(3, "Le nom d'utilisateur doit faire au moins 3 caractères.")
  .max(30, "Le nom d'utilisateur ne peut pas dépasser 30 caractères.");

export const loginSchema = z.object({
  // Peut être un pseudo ou une adresse e-mail, d'où l'absence de contrainte forte.
  username: z.string().trim().min(1, "Identifiant requis."),
  password: z.string().min(1, "Mot de passe requis."),
});

export const registerSchema = z.object({
  username,
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password,
});

export const updateUsernameSchema = z.object({
  username,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
