const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5180";

const NGROK_HOST = /\.ngrok(-free)?\.(app|dev|io)$/;
const LAN_ORIGIN = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:5180$/;

export const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true; // requêtes non-navigateur (curl, wscat, etc.)
  if (origin === CLIENT_ORIGIN) return true;
  if (LAN_ORIGIN.test(origin)) return true;
  try {
    return NGROK_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

export default isAllowedOrigin;
