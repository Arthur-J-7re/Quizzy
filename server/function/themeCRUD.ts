import { ThemeModel, PBThemeModel } from "../Collection/theme";

const create = async (data : any) =>{
    switch (data.type){
        case "theme":
            createTheme(data);
            break;
        case "pbtheme":
            createPBTheme(data);
            break;
        default:
            throw new Error("Invalid theme type");
    }
}

const createTheme = async (data : any) =>{
    try {
        const newTheme = await ThemeModel.create({
            name: data.name,
            questions: data.questions || []
        });
        return ({success : true, theme_id : newTheme.id})
    } catch (error) {
        return ({success : false});
    }
}

const createPBTheme = async (data : any) =>{
    try {
        const newPBTheme = await PBThemeModel.create({
            imgOrString: data.imgOrString,
            img: data.img,
            name: data.name,
            questions: data.questions || []
        });
        return ({success : true, theme_id : newPBTheme.id})
    } catch (error) {
        return ({success : false});
    }
}

const update = async (data : any) =>{
    switch (data.type){
        case "theme":
            return updateTheme(data);
        case "pbtheme":
            return updatePBTheme(data);
    }
}

const updateTheme = async (data : any) =>{
    try {
        await ThemeModel.updateOne({id: data.id}, {
            name: data.name,
            questions: data.questions || []
        });
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }   
}

const updatePBTheme = async (data : any) =>{
    try {
        await PBThemeModel.updateOne({id: data.id}, {
            imgOrString: data.imgOrString,
            img: data.img,
            name: data.name,
            questions: data.questions || []
        });
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const deleteTheme = async (theme_id : number, type : string) =>{
    try {
        switch (type){
            case "theme":
                await ThemeModel.deleteOne({id: theme_id});
                break;
            case "pbtheme":
                await PBThemeModel.deleteOne({id: theme_id});
                break;
        }
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const gethemeById = async (theme_id : number, type : string) =>{
    try {
        switch (type){
            case "theme":
                return await ThemeModel.findOne({id: theme_id});
            case "pbtheme":
                return await PBThemeModel.findOne({id: theme_id});
        }
    } catch (error) {
        return null;
    }
}

const getByCreator = async (creator_id : number) =>{
    try {
        const themes = await ThemeModel.find({creator: creator_id});
        const pbThemes = await PBThemeModel.find({creator: creator_id});
        return {themes, pbThemes};
    } catch (error) {
        return {themes: [], pbThemes: []};
    }
}

export const themeCRUD = {
    create,
    update,
    deleteTheme,
    gethemeById,
    getByCreator
}