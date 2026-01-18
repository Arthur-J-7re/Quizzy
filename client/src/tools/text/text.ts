export function getPruralOf(word : string) {
    return word.toLowerCase() != "quizz" ?
    word+"s":
    word    
}