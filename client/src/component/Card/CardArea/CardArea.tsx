import Card from "../Card"

export function CardArea(
    {
        title,
        cards,
        emptyText,
        link,
        draggable = false,
        setUsedCard = ()=>{},
    } : {
        title : string,
        cards : Card[],
        emptyText : string,
        link : string,
        draggable : boolean,
        setUsedCard : Function,
    }
) {
    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
        event.dataTransfer.setData("index", index.toString());
    };
        
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Permet le drop
    };
    
    const handleDrop = (event: React.DragEvent<HTMLDivElement>, newIndex: number) => {
        event.preventDefault();
        const oldIndex = Number(event.dataTransfer.getData("index"));
        setUsedCard((prevCards : Card[]) => {
            const updatedCards = [...prevCards];
            const [movedCard] = updatedCards.splice(oldIndex, 1);
            updatedCards.splice(newIndex, 0, movedCard);
            return updatedCards;
        });
    }; 
    return (
        <>
            <div className="subTitle">{title}</div>
            <div className="CardArea">
                {cards.length > 0 ? (
                    cards.map((Card, index) => (
                        draggable ?
                        <div
                            key={Card.getId()}
                            draggable
                            onDragStart={(event) => handleDragStart(event, index)}
                            onDragOver={handleDragOver}
                            onDrop={(event) => handleDrop(event, index)}
                            style={{
                                cursor: "grab",
                            }}
                            className="dragZone"
                        >
                            {Card.show()}
                        </div>
                        :
                        <>{Card.show()}</>
                    ))
                ) : (
                    <h2 className="filler">{(link != "" && link != null && link != undefined) ?<a href={link}>{emptyText}</a> : emptyText}</h2>
                )}
            </div>
        </>
    )
}