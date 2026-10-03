import { existsSync, unlinkSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { UPLOAD_DIR } from "./config.js";
import { safeUploadPath } from "./http.js";

function uploadPathname(value) {
  const text = String(value || "");
  if (!text) return null;

  if (text.startsWith("/uploads/")) return text;
  try {
    const parsed = new URL(text);
    return parsed.pathname.startsWith("/uploads/") ? parsed.pathname : null;
  } catch {
    return null;
  }
}

export function deleteOwnedUpload(value, ownerId) {
  const pathname = uploadPathname(value);
  if (!pathname || !ownerId) return false;

  let decoded;
  try {
    decoded = decodeURIComponent(pathname.slice("/uploads/".length));
  } catch {
    return false;
  }

  const safe = safeUploadPath(decoded);
  if (safe !== decoded.replace(/\\/g, "/")) return false;
  if (!safe.startsWith(`${ownerId}/`)) return false;

  const root = normalize(UPLOAD_DIR);
  const full = normalize(join(root, safe));
  if (!full.startsWith(`${root}${sep}`)) return false;
  if (!existsSync(full)) return false;

  unlinkSync(full);
  return true;
}
