import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { UPLOAD_DIR } from "./config.js";
import { readDb, writeDb } from "./db.js";
import {
  authUser,
  cleanEmail,
  createSession,
  hashPassword,
  requireUser,
  safeUser,
} from "./auth.js";
import { json, readBody, safeUploadPath } from "./http.js";
import { executeQuery } from "./query.js";

export async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, storage: "local-json" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const password = String(body.password || "");

    if (!email || !email.includes("@")) {
      return json(res, 400, { error: "Email không hợp lệ." });
    }
    if (password.length < 6) {
      return json(res, 400, { error: "Mật khẩu phải ít nhất 6 ký tự." });
    }
    if (db.users.some((user) => user.email === email)) {
      return json(res, 409, { error: "Email đã tồn tại." });
    }

    const id = randomUUID();
    const salt = randomBytes(16).toString("hex");
    const fullName = String(body.full_name || "").trim();
    const now = new Date().toISOString();
    const user = {
      id,
      email,
      password_salt: salt,
      password_hash: hashPassword(password, salt),
      user_metadata: { full_name: fullName },
      created_at: now,
    };

    db.users.push(user);
    db.profiles.push({
      id,
      email,
      display_name: fullName || email.split("@")[0],
      avatar_url: null,
      phone: null,
      zalo: null,
      role: "user",
      created_at: now,
      updated_at: now,
    });

    const sessionToken = createSession(db, id);
    writeDb(db);
    return json(res, 201, { user: safeUser(user), token: sessionToken });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const user = db.users.find((item) => item.email === email);

    if (!user) {
      return json(res, 401, { error: "Email hoặc mật khẩu không đúng." });
    }

    const actual = Buffer.from(
      hashPassword(String(body.password || ""), user.password_salt),
      "hex",
    );
    const expected = Buffer.from(user.password_hash, "hex");

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return json(res, 401, { error: "Email hoặc mật khẩu không đúng." });
    }

    const sessionToken = createSession(db, user.id);
    writeDb(db);
    return json(res, 200, { user: safeUser(user), token: sessionToken });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const header = String(req.headers.authorization || "");
    const sessionToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (sessionToken) {
      db.sessions = db.sessions.filter((session) => session.token !== sessionToken);
      writeDb(db);
    }
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = requireUser(req, res, db);
    if (!user) return;
    return json(res, 200, { user: safeUser(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/query") {
    const body = await readBody(req);
    const user = authUser(req, db);
    try {
      return json(res, 200, { data: executeQuery(body, user, db) });
    } catch (error) {
      return json(res, error.status || 400, { error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/upload") {
    const user = requireUser(req, res, db);
    if (!user) return;

    try {
      const body = await readBody(req);
      const relative = safeUploadPath(body.path);
      const full = join(UPLOAD_DIR, relative);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, Buffer.from(String(body.data || ""), "base64"));
      return json(res, 201, { path: relative, url: `/uploads/${relative}` });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/rpc/")) {
    const user = requireUser(req, res, db);
    if (!user) return;

    const name = decodeURIComponent(url.pathname.slice("/api/rpc/".length));
    const body = await readBody(req);
    const pet = db.pets.find((item) => item.id === body.p_case_id);

    if (name === "claim_rescue_case") {
      if (
        !pet ||
        pet.category !== "rescue" ||
        pet.rescuer_id ||
        ["closed", "delivered", "completed"].includes(pet.status)
      ) {
        return json(res, 200, { data: false });
      }
      pet.rescuer_id = user.id;
      pet.updated_at = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { data: true });
    }

    if (name === "update_rescue_support_info") {
      if (!pet || pet.category !== "rescue" || pet.rescuer_id !== user.id) {
        return json(res, 200, { data: false });
      }
      pet.bank_account_number =
        String(body.p_bank_account_number || "").trim() || null;
      pet.bank_account_name =
        String(body.p_bank_account_name || "").trim() || null;
      pet.bank_name = String(body.p_bank_name || "").trim() || null;
      pet.updated_at = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { data: true });
    }

    if (name === "close_rescue_case_simple") {
      if (
        !pet ||
        pet.category !== "rescue" ||
        (pet.owner_id !== user.id && pet.rescuer_id !== user.id)
      ) {
        return json(res, 200, { data: false });
      }
      pet.status = "delivered";
      pet.completed_at = new Date().toISOString();
      pet.updated_at = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { data: true });
    }

    return json(res, 404, { error: "Unknown RPC" });
  }

  return json(res, 404, { error: "Not found" });
}
