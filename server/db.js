import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { DB_BACKUP_FILE, DB_FILE } from "./config.js";

export function emptyDb() {
  return {
    users: [],
    profiles: [],
    pets: [],
    rescue_appeals: [],
    rescue_updates: [],
    sessions: [],
  };
}

function normalizeDb(value) {
  return { ...emptyDb(), ...(value || {}) };
}

function parseDb(path) {
  return normalizeDb(JSON.parse(readFileSync(path, "utf8")));
}

if (!existsSync(DB_FILE)) {
  writeFileSync(DB_FILE, JSON.stringify(emptyDb(), null, 2));
}

export function readDb() {
  try {
    return parseDb(DB_FILE);
  } catch (primaryError) {
    if (existsSync(DB_BACKUP_FILE)) {
      try {
        const backup = parseDb(DB_BACKUP_FILE);
        copyFileSync(DB_BACKUP_FILE, DB_FILE);
        console.error("db.json bị lỗi; đã khôi phục từ bản backup.");
        return backup;
      } catch {
        // Fall through to the explicit failure below.
      }
    }

    const error = new Error(
      "Không thể đọc cơ sở dữ liệu. Dữ liệu hiện có được giữ nguyên để tránh ghi đè.",
    );
    error.cause = primaryError;
    throw error;
  }
}

export function writeDb(db) {
  const temp = `${DB_FILE}.tmp`;

  if (existsSync(DB_FILE)) {
    copyFileSync(DB_FILE, DB_BACKUP_FILE);
  }

  writeFileSync(temp, JSON.stringify(normalizeDb(db), null, 2));
  renameSync(temp, DB_FILE);
}
