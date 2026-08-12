import { FolderModel } from "../Collection/folder";
import { QuestionModel } from "../Collection/questions";
import logger from "../utils/logger";

const create = async (data: any) => {
    try {
        const newFolder = await FolderModel.create({
            creator: data.creator,
            name: data.name,
        });
        return { success: true, folder: newFolder };
    } catch (error) {
        logger.error("Erreur lors de la création du dossier", error);
        return { success: false };
    }
};

const update = async (data: any) => {
    try {
        await FolderModel.updateOne({ folder_id: data.folder_id }, { name: data.name });
        return { success: true };
    } catch (error) {
        logger.error("Erreur lors de la mise à jour du dossier", error);
        return { success: false };
    }
};

// Une question du dossier supprimé redevient "sans dossier" plutôt que de
// garder une référence orpheline vers un folder_id qui n'existe plus.
const deleteFolder = async (folder_id: number) => {
    try {
        await QuestionModel.updateMany({ folder_id }, { $unset: { folder_id: "" } });
        await FolderModel.deleteOne({ folder_id });
        return { success: true };
    } catch (error) {
        logger.error("Erreur lors de la suppression du dossier", error);
        return { success: false };
    }
};

const getFoldersByCreator = async (creator_id: number) => {
    try {
        return await FolderModel.find({ creator: creator_id }).sort({ name: 1 });
    } catch (error) {
        logger.error("Erreur lors de la récupération des dossiers", error);
        return [];
    }
};

const getCreatorOfFolder = async (folder_id: number) => {
    try {
        const folder = await FolderModel.findOne({ folder_id });
        return folder?.creator;
    } catch (error) {
        logger.error("Erreur lors de la récupération du créateur du dossier", error);
        return undefined;
    }
};

export default {
    create,
    update,
    deleteFolder,
    getFoldersByCreator,
    getCreatorOfFolder,
};
