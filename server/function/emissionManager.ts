import EmissionModel from "../Collection/emission";

const create = async (data : any) => {
    console.log(data);
    try {
        if (!data.creator || !data.steps) {
            throw new Error("Missing required fields");
        }
        const newEmission = await EmissionModel.create({
            creator: data.creator,
            steps : data.steps || [],
            title: data.title || "",
            private: data.private || true,
        });
        console.log("new emission : ",newEmission);
        return ({success : true, emission_id : newEmission.emission_id})
    } catch (error) {
        console.error(error);
        return ({success : false, emission_id : null});
    }
}

const update = async (data : any) =>{
    console.log(data);
    try {
        if (!data.emission_id || !data.steps || data.creator) {
            throw new Error("Missing required fields");
        }
        await EmissionModel.updateOne({emission_id: data.emission_id}, {
            steps : data.steps,
            title: data.title,
            private: data.private,
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

const getEmissionByCreator = async (creator_id : number) =>{
    try {
        const emissions = await EmissionModel.find({creator: creator_id}).lean();
        return emissions;
    } catch (error) {
        return [];
    }   
}

const getCreatorOfEmission = async (id: String | number) => {
    try {
        let retour = await EmissionModel.findOne().where('emission_id').equals(id);
        return retour?.creator;
    } catch (error) {
        console.error("erreur lors de la récupération du créateur", error);
    }
}

const getPublicEmissions = async () => {
    try {
        const emissions = await EmissionModel.find({private: false}).lean();
        return emissions;
    } catch (error) {
        return [];
    }
}

const getAvailableEmissions = async (id : number) => {
    try {
        const CreatorEmissions = await getEmissionByCreator(id);
        const PublicEmissions = await getPublicEmissions();
        const mergedEmissions = [...CreatorEmissions];
        const creatorEmissionIds = new Set(CreatorEmissions.map(emission => emission.emission_id));

        for (let pbemission in PublicEmissions){
            if (!creatorEmissionIds.has(PublicEmissions[pbemission].emission_id)) {
                mergedEmissions.push(PublicEmissions[pbemission]);
            }
        }

        return mergedEmissions;
    } catch (error) {
        console.error("erreur lors de la récupération des émissions disponibles", error);
        return [];
    }
}

export default{
    create,
    update,
    deleteEmission,
    getById,
    getEmissionByCreator,
    getCreatorOfEmission,
    getPublicEmissions,
    getAvailableEmissions,
}