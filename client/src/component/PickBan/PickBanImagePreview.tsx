import "./PickBanImagePreview.css";

/**
 * Aperçu plein écran des images d'un pick&ban en cours de création : juste
 * les images, alignées en grille, sans titre ni case ni statut — pour
 * vérifier d'un coup d'œil que les URLs choisies rendent bien ensemble.
 */
export default function PickBanImagePreview({
    images,
    onClose,
}: {
    images: string[];
    onClose: () => void;
}) {
    return (
        <div className="pbImagePreviewOverlay" onClick={onClose}>
            <div className="pbImagePreviewPanel" onClick={(e) => e.stopPropagation()}>
                <header className="pbImagePreviewHeader">
                    <h2>Aperçu des images ({images.length})</h2>
                    <button type="button" className="pbImagePreviewClose" onClick={onClose}>✕</button>
                </header>
                {images.length === 0 ? (
                    <p className="pbImagePreviewEmpty">Aucun thème sélectionné n'a d'image.</p>
                ) : (
                    <div className="pbImagePreviewGrid">
                        {images.map((src, i) => (
                            <img key={i} src={src} alt="" className="pbImagePreviewImg" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
