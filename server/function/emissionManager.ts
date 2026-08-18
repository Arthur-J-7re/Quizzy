import EmissionModel from "../Collection/emission";
import logger from "../utils/logger";
import { isEmissionEffectivelyPublic, getEmissionBlockingCount } from "./publicationStatus";

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

/** Chargement en lot (ex: résoudre une émission ouverte directement par son id, sans état de navigation). */
const getEmissionsByIds = async (ids : number[]) => {
    if (ids.length === 0) return [];
    try {
        return await EmissionModel.find({ emission_id: { $in: ids } }).lean();
    } catch (error) {
        return [];
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
        return undefined;
    }
}

const getPublicEmissions = async () => {
    try {
        const candidates = await EmissionModel.find({private: false}).lean();
        const flags = await Promise.all(candidates.map((e) => isEmissionEffectivelyPublic(e)));
        return candidates.filter((_, i) => flags[i]);
    } catch (error) {
        return [];
    }
}

/** Réservé à l'écran d'édition du créateur : pourquoi son émission "publique" ne l'est pas encore vraiment. */
const getPublicationStatus = async (emission_id: number) => {
    const emission = await EmissionModel.findOne({ emission_id }).lean();
    if (!emission) return { effectivePublic: false, blockedCount: 0 };
    return {
        effectivePublic: await isEmissionEffectivelyPublic(emission),
        blockedCount: await getEmissionBlockingCount(emission),
    };
};

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
    getEmissionsByIds,
    getEmissionByCreator,
    getCreatorOfEmission,
    getPublicEmissions,
    getAvailableEmissions,
    getPublicationStatus,
}