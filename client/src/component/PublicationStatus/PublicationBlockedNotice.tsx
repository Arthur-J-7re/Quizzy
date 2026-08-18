import "./PublicationBlockedNotice.css";

/**
 * Message affiché sous le switch privé/public quand la publication demandée
 * par le créateur est bloquée par la cascade (cf. ROADMAP.md, Phase 3) :
 * une ou plusieurs questions référencées, même indirectement, ne sont pas
 * encore approuvées par un admin.
 */
export default function PublicationBlockedNotice({
    blockedCount,
    entityLabel,
}: {
    blockedCount: number;
    entityLabel: string;
}) {
    if (blockedCount <= 0) return null;

    return (
        <p className="publicationBlockedNotice">
            Ce {entityLabel} restera privé tant que {blockedCount} question{blockedCount > 1 ? "s" : ""} référencée{blockedCount > 1 ? "s" : ""} ne {blockedCount > 1 ? "seront" : "sera"} pas approuvée{blockedCount > 1 ? "s" : ""}.
        </p>
    );
}
