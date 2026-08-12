import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// Erreur métier qu'on assume renvoyer telle quelle au client.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Middleware d'erreur final : avant, chaque route faisait
// `catch (e) { console.error(e) }` puis répondait 200 avec un corps vide.
export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: err.issues[0]?.message ?? "Requête invalide.",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }

  console.error("Erreur non gérée :", err);
  res.status(500).json({ success: false, message: "Une erreur interne est survenue." });
}
