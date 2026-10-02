import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, "..");
export const DATA_DIR = join(__dirname, "data");
export const DB_FILE = join(DATA_DIR, "db.json");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");
export const DIST_DIR = join(ROOT, "dist");
export const PORT = Number(process.env.PORT || 8787);
export const SESSION_DAYS = 30;

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });
