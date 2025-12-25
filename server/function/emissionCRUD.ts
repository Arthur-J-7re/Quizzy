import EmissionModel from "../Collection/emission";

const create = async (data : any) => {
    try {
        if (!data.creator || !data.steps || !data.keepPoint) {
            throw new Error("Missing required fields");
        }
        const newEmission = await EmissionModel.create({
            creator: data.creator,
            steps : data.steps || [],
            keepPoint : data.keepPoint || false,
        });
        return ({success : true, emission_id : newEmission.emission_id})
    } catch (error) {
        return ({success : false});
    }
}

const update = async (data : any) =>{
    try {
        if (!data.emission_id || !data.steps || !data.keepPoint || data.creator) {
            throw new Error("Missing required fields");
        }
        await EmissionModel.updateOne({emission_id: data.emission_id}, {
            steps : data.steps,
            keepPoint : data.keepPoint,
        });
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const deleteEmission = async (emission_id : number) =>{
    try {
        await EmissionModel.deleteOne({emission_id: emission_id});
        return ({success : true})
    } catch (error) {
        return ({success : false});
    }
}

const getById = async (emission_id : number) =>{
    try {
        const emission = await EmissionModel.findOne({emission_id: emission_id}).lean();
        return emission;
    } catch (error) {
        return null;
    }   
}

const getByCreator = async (creator_id : number) =>{
    try {
        const emissions = await EmissionModel.find({creator: creator_id}).lean();
        return emissions;
    } catch (error) {
        return [];
    }   
}

export const emissionCRUD = {
    create,
    update,
    deleteEmission,
    getById,
    getByCreator
}