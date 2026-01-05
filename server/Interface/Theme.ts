export interface Theme {
    theme_id: number,
    creator: number,
    title: string,
    questions: number[],
}

export interface PBTheme extends Theme {
    imgOrString: boolean,
    img ?: string,
}