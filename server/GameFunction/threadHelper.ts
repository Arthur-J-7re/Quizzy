export function verify (name : string, question : any, answer : any){
    console.log("ça verifie la réponse de : ", name);

    switch (question.mode){
        case "QCM" : 
            return (answer === question.answer)
        case "FREE" : 
            let success = false;
            let normalizedUserAnswer = normalizeText(String(answer));
    
            question.answers.forEach((answer: string) => {
                const normalizedExpectedAnswer = normalizeText(answer);
    
                if (normalizedUserAnswer === normalizedExpectedAnswer) {
                    success = true;
                }
            });
    
            return success;

        case "VF" : 
            return ((answer === "vrai" && question.truth) || (answer === "faux" && (!question.truth)))
            
        case "DCC" :  
            return verifyDcc(name,question, answer);
        default:
            return false;
    }
}

export function verifyDcc (name : string, question: any,answer : any){
    const mode = answer.mode;
    if (mode){
        switch(mode){
            case "CASH":
                let success = false;
                let normalizedUserAnswer = normalizeText(String(answer.value));
        
                question.cash.forEach((answer: string) => {
                    const normalizedExpectedAnswer = normalizeText(answer);
        
                    if (normalizedUserAnswer === normalizedExpectedAnswer) {
                        success = true;
                    }
                });
        
                return success;
            case "DUO":
            case "CARRE":
                return (answer.value === question.answer)
            default :
                return false;
        }
    } else {
        return false
    }
}

export function getValueOfQuestion(question : any, dccMode : any = "none"){
    const level = question.level
    let bonus = 0;
    switch (dccMode){
        case "CASH":
            bonus = 2;
            break;
        case "Carre":
            bonus = 1;
            break;
        default:
            bonus = 0;
            break;
    }
    
    if (!level || level < 4){
        return 1
    } else if (level > 7) {
        return 2
    } else {
        return 3
    }
}

export function normalizeText(str: string): string {
    return str
        .normalize("NFD")                  // décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, "")   // enlève les diacritiques (accents)
        .replace(/\s+/g, "")               // enlève tous les espaces
        .toLowerCase();                    // met tout en minuscule
}
