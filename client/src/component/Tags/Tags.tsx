export default function GetTags(
    {
        entity,
        setEntity,
        limit,
    }
    :
    {
        entity:{tags: string[]},
        setEntity:(entity : any) => void,
        limit:number
    }
) {
    const tags = entity.tags;

    const removeTag = (tagToRemove : string) => {
        setTags(tags.filter((tag : string) => tag !== tagToRemove));  
    };

    const addTag = (tag : string) => {
        if (!tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
        }
    };

    const setTags = (tags : string[]) => {
        setEntity({...entity, tags})
    }

    return (
        <div>
            <div className="quizzTagList">
                {tags.map((tag : string) => (
                    <span key={tag} onClick={() => removeTag(tag)} className="quizzTagChip">
                        {tag} ❌
                    </span>
                ))}
            </div>
            {tags.length < limit ? (
                <input
                type="text"
                className='quizzTagInput'
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
                <p className="quizzTagLimit">Maximum {limit} tags atteints</p>
            )}
        </div>
    )

}