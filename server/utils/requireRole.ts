import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../shared-types/user";
import userManager from "../function/userManager";
import getIdFromReq from "./getIdFromReq";

// Lit le rôle en base à chaque requête plutôt que de le mettre dans le JWT :
// un admin rétrogradé perd ses droits immédiatement, sans attendre l'expiration
// du token (7 jours, cf. utils/jwt.ts).
// À n'utiliser que sur une route déjà protégée par jwt.verifyToken.
export default function requireRole(allowed: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = getIdFromReq(req);
    const role = await userManager.getRole(userId);
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ success: false, message: "Accès réservé aux administrateurs." });
      return;
    }
    next();
  };
}
