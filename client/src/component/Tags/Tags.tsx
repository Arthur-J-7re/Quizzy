export default function GetTags(
    {
        entity,
        setEntity,
        limit,
    }
    :
    {
        entity:{tags: string[]},
        setEntity:Function,
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
            <div className="display-tag">
                {
                    tags.map((tag : string) => 
                        <h2>{tag}
                        <p onClick={()=>{removeTag(tag)}}>
                            X
                        </p>
                        </h2>
                    )
                }
            </div>
            <div>
                {tags.length < limit ? (
                    <input 
                    type="text" 
                    className='tagInput'
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
                    <p style={{ color: "red" }}>Maximum 5 tags atteints</p>
                )}
            </div>
        </div>
    )

}