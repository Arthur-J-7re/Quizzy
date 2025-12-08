import "./result.css"

export function BRRRBlock({key, name,lp,success,isYou}: {key : string,name: string, lp: number, success: boolean, isYou : boolean} ) {
  return (
    <div key={`${key}`} className={`BRRR-Block ${success ? "BRRR-Truth" : "BRRR-Wrong"} ${isYou ? "BRRR-Ontop":""}`}>
      <p className="BRRR-name">{name}</p>
      <div className="BRRR-lp">
        {Array.from({ length: lp }).map((_, i) => (
          <span key={i}>♥</span>
        ))}
      </div>
    </div>
  );
}
