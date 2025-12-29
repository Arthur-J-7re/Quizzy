import Step from "./Step";

export default interface Emission {
    emission_id: number,
    creator: number,
    privatte: boolean,
    title: string,
    steps : Step[],
    keepPoint : boolean[],
}