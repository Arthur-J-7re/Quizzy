// Logger minimal à niveaux. Le projet loggait ~145 console.log de debug en
// permanence, dont le body du login (donc le mot de passe en clair).
// LOG_LEVEL=debug pour retrouver la verbosité d'avant.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;

type Level = keyof typeof LEVELS;

const current: Level = (process.env.LOG_LEVEL as Level) || "info";
const threshold = LEVELS[current] ?? LEVELS.info;

const at = (level: Level) =>
  (...args: unknown[]): void => {
    if (LEVELS[level] >= threshold) {
      (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(...args);
    }
  };

export default {
  debug: at("debug"),
  info: at("info"),
  warn: at("warn"),
  error: at("error"),
};
