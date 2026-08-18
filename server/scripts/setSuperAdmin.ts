import dotenv from "dotenv";
dotenv.config();

import mongoose from "../db";
import User from "../Collection/user";

/**
 * Promeut un compte existant en "superadmin". Volontairement hors API : le
 * premier super admin ne peut être créé par personne d'autre que quelqu'un
 * ayant accès au serveur, et ce rôle ne doit jamais être distribuable via une
 * route HTTP (cf. server/routes/adminRoutes.ts, qui refuse "superadmin").
 *
 * Usage : npx ts-node server/scripts/setSuperAdmin.ts <email>
 */
async function main(): Promise<void> {
    const email = process.argv[2];
    if (!email) {
        console.error("Usage : npx ts-node server/scripts/setSuperAdmin.ts <email>");
        process.exit(1);
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined in the environment variables.");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connexion réussie avec la base de données");

    const retour = await User.updateOne({ email: email.toLowerCase().trim() }, { $set: { role: "superadmin" } });
    if (retour.matchedCount === 0) {
        console.error(`Aucun compte trouvé pour l'adresse ${email}.`);
    } else {
        console.log(`${email} est maintenant superadmin.`);
    }

    await mongoose.disconnect();
}

main().catch((error) => {
    console.error("Erreur pendant la promotion en super admin :", error);
    process.exit(1);
});
