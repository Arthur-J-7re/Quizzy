export interface Theme {
    theme_id: number,
    creator: number,
    name: string,
    questions: number[],
}

export interface PBTheme extends Theme {
    imgOrString: boolean,
    img ?: string,
}