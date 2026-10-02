import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { DB_FILE } from "./config.js";

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

if (!existsSync(DB_FILE)) {
  writeFileSync(DB_FILE, JSON.stringify(emptyDb(), null, 2));
}

export function readDb() {
  try {
    const db = JSON.parse(readFileSync(DB_FILE, "utf8"));
    return { ...emptyDb(), ...db };
  } catch {
    return emptyDb();
  }
}

export function writeDb(db) {
  const temp = `${DB_FILE}.tmp`;
  writeFileSync(temp, JSON.stringify(db, null, 2));
  renameSync(temp, DB_FILE);
}
