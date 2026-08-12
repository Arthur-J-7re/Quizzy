import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

// Durée de vie du token. Volontairement courte comparée aux 3 mois précédents :
// le token vit dans le localStorage, donc lisible par n'importe quel XSS.
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "7d";

export interface TokenPayload {
  id: number;
}

// Requête dont on sait que verifyToken est passé avant.
export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment variables.");
  }
  return secret;
};

export const signUserToken = (id: number): string =>
  jwt.sign({ id }, getJwtSecret(), { expiresIn: TOKEN_TTL } as jwt.SignOptions);

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];

  // Vérifie s'il y a un header Authorization avec "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ success: false, message: "Accès refusé. Token manquant." });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    (req as AuthenticatedRequest).user = { id: Number(decoded.id) };
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: "Token invalide ou expiré." });
  }
};

export default { verifyToken, getJwtSecret, signUserToken };
