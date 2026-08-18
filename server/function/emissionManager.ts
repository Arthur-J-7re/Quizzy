import EmissionModel from "../Collection/emission";
import { isEmissionEffectivelyPublic, getEmissionBlockingCount } from "./publicationStatus";
import { createEntityQueryHelpers } from "./entityQueryHelpers";

const {
    getByCreator: getEmissionByCreator,
    getAvailable: getAvailableEmissions,
    getPublic: getPublicEmissions,
    getByIds: getEmissionsByIds,
    getCreatorOf: getCreatorOfEmission,
    getPublicationStatus,
} = createEntityQueryHelpers({
    model: EmissionModel,
    idField: "emission_id",
    entityLabel: "émissions",
    isEffectivelyPublic: isEmissionEffectivelyPublic,
    getBlockingCount: getEmissionBlockingCount,
    lean: true,
});

const create = async (data : any) => {
    try {
        if (!data.creator || !data.steps) {
            throw new Error("Missing required fields");
        }
        const newEmission = await EmissionModel.create({
            creator: data.creator,
            steps : data.steps || [],
            title: data.title || "",
            private: data.private ?? true,
            options: {
                numberOfPlayers: data.options?.numberOfPlayers ?? 4,
                teams: data.options?.teams ?? false,
                playerThemeEnabled: data.options?.playerThemeEnabled ?? false,
                hostModeEnabled: data.options?.hostModeEnabled ?? false,
            },
        });
        return ({success : true, emission_id : newEmission.emission_id})
    } catch (error) {
        console.error("Erreur lors de la création de l'émission", error);
        return ({success : false, emission_id : null});
    }
}

const update = async (data : any) =>{
    try {
        // `data.creator` était testé ici par erreur : comme la route l'ajoute
        // systématiquement, cette condition rejetait TOUTES les mises à jour.
        if (!data.emission_id || !data.steps) {
            throw new Error("Missing required fields");
        }
        await EmissionModel.updateOne({emission_id: data.emission_id}, {
            steps : data.steps,
            title: data.title,
            private: data.private,
            options: {
                numberOfPlayers: data.options?.numberOfPlayers ?? 4,
                teams: data.options?.teams ?? false,
                playerThemeEnabled: data.options?.playerThemeEnabled ?? false,
                hostModeEnabled: data.options?.hostModeEnabled ?? false,
            },
        });
        return ({success : true})
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'émission", error);
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

export default{
    create,
    update,
    deleteEmission,
    getById,
    getEmissionsByIds,
    getEmissionByCreator,
    getCreatorOfEmission,
    getPublicEmissions,
    getAvailableEmissions,
    getPublicationStatus,
}