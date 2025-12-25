import Step from "./Step";

export default interface Emission {
    emission_id: number,
    creator: number,
    steps : Step[],
    keepPoint : boolean[],
}