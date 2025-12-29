const jwt = require("jsonwebtoken");

const verifyToken = (req : any, res : any, next : any) => {
  const authHeader = req.headers["authorization"];

  // Vérifie s'il y a un header Authorization avec "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Accès refusé. Token manquant." });
  }

  try {
    const secret = process.env.JWT_SECRET || "votre_clé_secrète"; // idéalement depuis .env
    const decoded = jwt.verify(token, secret);
    req.user = decoded; 
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: "Token invalide ou expiré." });
  }
};

export default {verifyToken};