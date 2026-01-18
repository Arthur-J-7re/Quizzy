import { get } from "mongoose";
import { ThemeModel } from "../Collection/theme";

const create = async (data : any) =>{
    console.log("tentative de création de theme avec la data : ", data);
    try {
        const newTheme = await ThemeModel.create({
            imgOrString: data.imgOrString || false,
            img: data.img,
            title: data.title,
            creator: data.creator,
            private: data.private,
            questions: data.questions || [],
            tags: data.tags || []
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
            tags: data.tags || []
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

const getThemeByCreator = async (creator_id : number, min : number) =>{
    try {
        const themes = await ThemeModel.find({
            creator: creator_id,
            $expr: {
                $gte: [{ $size: "$questions" }, min]
            }
        });
        return themes;
    } catch (error) {
        return [];
    }
}

const getPublicThemes = async (min : number) => {
    try {
        const themes = await ThemeModel.find({
            private: false,
            $expr: {
                $gte: [{ $size: "$questions" }, min]
            }
        });
        return themes;
    } catch (error) {
        return [];
    }
}

const getAvailableThemes = async (id: number, min : number) => {
    try {
        let retour;
        const CreatorThemes = await getThemeByCreator(id, min);
        const PublicThemes = await getPublicThemes(min);

        const existingThemeIds = new Set(
            PublicThemes.map((t: any) => t.theme_id)
        );

        const filteredCreatorThemes = CreatorThemes.filter(
            (t: any) => !existingThemeIds.has(t.theme_id)
        );
        
        return [...PublicThemes, ...filteredCreatorThemes];
    } catch (error) {
        console.error("erreur lors de la récupération des thèmes disponibles", error);
        return [];
    }
};

const getCreatorOfTheme = async (id: number) => {
    try {
        const retour = await ThemeModel.findOne().where('theme_id').equals(id);
        console.log("id : ",id,"theme : ", retour);
        return retour?.creator;
    } catch (error) {
        console.error("erreur lors de la récupération du créateur", error);
    }
}

export default{
    create,
    update,
    deleteTheme,
    getThemeById,
    getThemeByCreator,
    getCreatorOfTheme,
    getPublicThemes,
    getAvailableThemes,
}