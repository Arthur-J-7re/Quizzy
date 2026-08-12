/**
 * Un seul événement générique, réutilisé par les moteurs qui supportent la
 * correction arbitre (List/Grid/PickBan/Points/BR — pas Timer, qui a déjà
 * son propre système de jugement présentateur). La cible et le nouveau
 * verdict suffisent : room_id/requester viennent de `socket.data`, jamais du
 * payload client.
 */
export const REFEREE_ACTIONS = {
  override: "referee:override",
} as const;
