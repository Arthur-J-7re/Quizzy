/** Éditeur de tags (max 5) partagé par les 4 formulaires de création de question. */
export default function TagEditor({
    tags,
    addTag,
    removeTag,
}: {
    tags: string[];
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
}) {
    return (
        <div className="tagList">
            <div className="tagSpanDispencer">
                {tags.map((tag) => (
                    <span key={tag} onClick={() => removeTag(tag)} className="tag">
                        {tag} ❌
                    </span>
                ))}
            </div>
            {tags.length < 5 ? (
                <input
                    type="text"
                    className="tagInput"
                    onKeyDown={(e) => {
                        const inputElement = e.target as HTMLInputElement;
                        if (e.key === "Enter" && inputElement.value.trim()) {
                            addTag(inputElement.value.trim());
                            inputElement.value = "";
                        }
                    }}
                    placeholder="Ajouter un tag"
                />
            ) : (
                <p className="questionTagLimit">Maximum 5 tags atteints</p>
            )}
        </div>
    );
}
