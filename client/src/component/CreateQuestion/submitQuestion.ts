import makeRequest from "../../tools/requestScheme";

/** Create/update dispatch partagé par les 4 formulaires : `question_id === 0` => création, sinon mise à jour. */
export default async function submitQuestion(question_id: number, data: object, endTask: () => void): Promise<void> {
    const response = question_id === 0
        ? await makeRequest("/question/create", "POST", data)
        : await makeRequest("/question/update", "PUT", { data, question_id });
    if (response.success) {
        endTask();
    }
}
