import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(__dirname, "..");
export const DATA_DIR = join(__dirname, "data");
export const DB_FILE = join(DATA_DIR, "db.json");
export const DB_BACKUP_FILE = join(DATA_DIR, "db.json.bak");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");
export const DIST_DIR = join(ROOT, "dist");
export const PORT = Number(process.env.PORT || 8787);
export const SESSION_DAYS = 30;
export const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
export const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === "1";
export const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });
