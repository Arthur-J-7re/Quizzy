import dotenv from "dotenv";
dotenv.config();

import mongoose from "../db";
import tagManager from "../function/tagManager";

/**
 * Migration unique, à lancer une fois après déploiement du nouveau schéma
 * `Question.tags: [Number]` (harmonisation des tags, cf. Collection/tag.ts).
 *
 * Passe par la collection Mongo brute plutôt que par `QuestionModel` : une
 * fois le schéma déployé, Mongoose caste automatiquement `tags` en `[Number]`
 * à la lecture, ce qui viderait silencieusement les anciens tags-strings
 * avant qu'on ait pu les lire. Idempotent : un document déjà migré (tous ses
 * tags sont des nombres) est simplement ignoré.
 */
async function migrate(): Promise<void> {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined in the environment variables.");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connexion réussie avec la base de données");

    const questions = mongoose.connection.collection("questions");
    const tagsCollection = mongoose.connection.collection("tags");
    const tagsBefore = await tagsCollection.countDocuments();

    let migrated = 0;
    let skipped = 0;

    const cursor = questions.find({ tags: { $exists: true, $type: "array" } });
    for await (const doc of cursor) {
        const rawTags: unknown[] = Array.isArray(doc.tags) ? doc.tags : [];
        if (rawTags.length === 0) continue;
        if (rawTags.every((t) => typeof t === "number")) {
            skipped += 1;
            continue;
        }

        const stringTags = rawTags.filter((t): t is string => typeof t === "string");
        const tagIds = await tagManager.resolveTags(stringTags);
        await questions.updateOne({ _id: doc._id }, { $set: { tags: tagIds } });
        migrated += 1;
    }

    const tagsAfter = await tagsCollection.countDocuments();

    console.log(`Migration terminée : ${migrated} question(s) migrée(s), ${skipped} déjà à jour (ignorée(s)).`);
    console.log(`${tagsAfter - tagsBefore} nouveau(x) tag(s) canonique(s) créé(s) (total en base : ${tagsAfter}).`);

    await mongoose.disconnect();
}

migrate().catch((error) => {
    console.error("Erreur pendant la migration des tags :", error);
    process.exit(1);
});
