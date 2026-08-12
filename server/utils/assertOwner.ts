import { HttpError } from "./errorHandler";

// Garde de propriété commune aux 4 CRUD (question, quizz, thème, émission).
// Avant, chaque routeur avait sa propre copie de ce test et répondait
// silencieusement {success: false} quand il échouait.
export default async function assertOwner(
  userId: number,
  entityId: number,
  getCreator: (id: number) => Promise<unknown>,
  label: string
): Promise<void> {
  if (!Number.isFinite(entityId)) {
    throw new HttpError(400, `Identifiant de ${label} invalide.`);
  }
  const creator = await getCreator(entityId);
  if (creator === undefined || creator === null) {
    throw new HttpError(404, `Cette ${label} n'existe pas.`);
  }
  if (Number(creator) !== Number(userId)) {
    throw new HttpError(403, `Vous n'êtes pas le créateur de cette ${label}.`);
  }
}
