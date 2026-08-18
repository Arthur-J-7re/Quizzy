import dotenv from "dotenv";
dotenv.config();

import mongoose from "../db";

/**
 * Migration unique, à lancer une fois après déploiement du nouveau schéma
 * `Question.status` (cf. ROADMAP.md, Phase 2 — remplace `Question.private`).
 *
 * `private:true` -> `status:"private"`, `private:false` -> `status:"approved"`
 * (pas de re-validation rétroactive du contenu déjà public). Passe par la
 * collection Mongo brute, comme migrateQuestionTags.ts : une fois le schéma
 * déployé, Mongoose caste/masque `private` à la lecture via QuestionModel.
 * Idempotent : un document qui a déjà `status` est ignoré.
 */
async function migrate(): Promise<void> {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined in the environment variables.");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connexion réussie avec la base de données");

    const questions = mongoose.connection.collection("questions");

    let migrated = 0;
    let skipped = 0;

    const cursor = questions.find({});
    for await (const doc of cursor) {
        if (doc.status !== undefined) {
            skipped += 1;
            continue;
        }
        const status = doc.private === false ? "approved" : "private";
        await questions.updateOne(
            { _id: doc._id },
            { $set: { status }, $unset: { private: "" } }
        );
        migrated += 1;
    }

    console.log(`Migration terminée : ${migrated} question(s) migrée(s), ${skipped} déjà à jour (ignorée(s)).`);

    await mongoose.disconnect();
}

migrate().catch((error) => {
    console.error("Erreur pendant la migration private -> status :", error);
    process.exit(1);
});
