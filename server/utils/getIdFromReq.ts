import type { Request } from "express";
import type { AuthenticatedRequest } from "./jwt";

// À n'utiliser que sur une route protégée par jwt.verifyToken : sans ce
// middleware, req.user est absent et on ne peut pas déduire d'identité.
export default function getIdFromReq(req: Request): number {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.id === undefined) {
    throw new Error("getIdFromReq appelé sur une route non protégée par verifyToken.");
  }
  return Number(user.id);
}
