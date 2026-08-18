import { ThemeModel } from "../Collection/theme";
import logger from "../utils/logger";
import { isThemeEffectivelyPublic, getThemeBlockingCount } from "./publicationStatus";
import { createEntityQueryHelpers } from "./entityQueryHelpers";

/** Un thème avec moins de `min` questions ne peut illustrer le mode qui l'embarque (ex. `cellsPerTheme` en Grid) — filtré en amont plutôt que côté client. */
const minQuestionsFilter = (min: number): Record<string, unknown> => ({
    $expr: { $gte: [{ $size: "$questions" }, min] },
});

const folderFilter = (folder?: string): Record<string, unknown> => {
    if (folder === "none") return { folder: { $exists: false } };
    if (folder) return { folder };
    return {};
};

const {
    getByCreator: getThemesByCreatorRaw,
    getAvailable: getAvailableThemesRaw,
    getPublic: getPublicThemesRaw,
    getByIds: getThemesByIds,
    getCreatorOf: getCreatorOfTheme,
    getPublicationStatus,
} = createEntityQueryHelpers({
    model: ThemeModel,
    idField: "theme_id",
    entityLabel: "thèmes",
    isEffectivelyPublic: isThemeEffectivelyPublic,
    getBlockingCount: getThemeBlockingCount,
});

const getThemeByCreator = (creator_id: number, min: number, folder?: string) =>
    getThemesByCreatorRaw(creator_id, { ...minQuestionsFilter(min), ...folderFilter(folder) });

const getPublicThemes = (min: number) => getPublicThemesRaw(minQuestionsFilter(min));

const getAvailableThemes = (id: number, min: number) => getAvailableThemesRaw(id, minQuestionsFilter(min));

const create = async (data : any) =>{
    logger.debug("tentative de création de theme avec la data : ", data);
    try {
        const newTheme = await ThemeModel.create({
            imgOrString: data.imgOrString || false,
            img: data.img,
            title: data.title,
            creator: data.creator,
            private: data.private,
            questions: data.questions || [],
            tags: data.tags || [],
            folder: data.folder || undefined,
        });
        return ({success : true, theme:newTheme})
    } catch (error) {
        return ({success : false});
    }
}

const update = async (data : any) =>{
    try {
        await ThemeModel.updateOne({theme_id: data.theme_id}, {
            imgOrString: data.imgOrString,
            img: data.img,
            title: data.title,
            private: data.private,
            questions: data.questions || [],
            tags: data.tags || [],
            folder: data.folder || undefined,
        });
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const deleteTheme = async (theme_id : number) =>{
    try {
        await ThemeModel.deleteOne({theme_id: theme_id});
        
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const getThemeById = async (theme_id : number) =>{
    try {
        return await ThemeModel.findOne({theme_id: theme_id});    
    } catch (error) {
        return null;
    }
}

export default{
    create,
    update,
    deleteTheme,
    getThemeById,
    getThemesByIds,
    getThemeByCreator,
    getCreatorOfTheme,
    getPublicThemes,
    getAvailableThemes,
    getPublicationStatus,
}