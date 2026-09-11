import dotenv from "dotenv";
dotenv.config();

import mongoose from "../db";

/**
 * Migration unique, à lancer une fois après déploiement du nouveau schéma
 * `User.role` (cf. ROADMAP.md, Phase 0). Le `default: "user"` du schéma ne
 * s'applique qu'à la création d'un document Mongoose — les comptes déjà en
 * base avant cette phase n'ont jamais reçu le champ, ce qui les rend
 * invisibles aux requêtes Mongo brutes filtrant sur `role` (ex.
 * `statsManager.getUserStats`, qui fait `User.countDocuments({ role })`).
 * Idempotent : un document qui a déjà `role` est ignoré.
 */
async function migrate(): Promise<void> {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined in the environment variables.");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connexion réussie avec la base de données");

    const users = mongoose.connection.collection("users");

    let migrated = 0;
    let skipped = 0;

    const cursor = users.find({});
    for await (const doc of cursor) {
        if (doc.role !== undefined) {
            skipped += 1;
            continue;
        }
        await users.updateOne({ _id: doc._id }, { $set: { role: "user" } });
        migrated += 1;
    }

    console.log(`Migration terminée : ${migrated} utilisateur(s) migré(s), ${skipped} déjà à jour (ignoré(s)).`);

    await mongoose.disconnect();
}

migrate().catch((error) => {
    console.error("Erreur pendant la migration des rôles utilisateur :", error);
    process.exit(1);
});
