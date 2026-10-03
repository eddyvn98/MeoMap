import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { clientKey, consumeRateLimit, validateImageUpload } from "./security.js";
import { UPLOAD_DIR } from "./config.js";
import { readDb, writeDb } from "./db.js";
import {
  authUser,
  cleanEmail,
  createSession,
  hashPassword,
  requireUser,
  revokeSession,
  safeUser,
} from "./auth.js";
import { json, readBody, safeUploadPath } from "./http.js";
import { executeQuery } from "./query.js";
import { cleanText } from "./validation.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLOSED_STATUSES = new Set(["closed", "delivered", "completed", "Found"]);

function isClosedPet(pet) {
  return CLOSED_STATUSES.has(String(pet?.status || ""));
}

function rateLimited(res, rate, message) {
  if (rate.allowed) return false;
  res.setHeader("Retry-After", String(rate.retryAfter));
  json(res, 429, { error: message });
  return true;
}

function verifyPassword(password, user) {
  const salt = user?.password_salt || "00000000000000000000000000000000";
  const expectedHex =
    user?.password_hash ||
    hashPassword("invalid-password-placeholder", salt);
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return !!user &&
    actual.length === expected.length &&
    timingSafeEqual(actual, expected);
}

export async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, storage: "local-json" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const rate = consumeRateLimit(`signup:${clientKey(req)}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimited(res, rate, "Bạn thao tác quá nhanh. Vui lòng thử lại sau.")) {
      return;
    }

    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const password = String(body.password || "");
    const fullName = cleanText(body.full_name, 120) || "";

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json(res, 400, { error: "Email không hợp lệ." });
    }
    if (password.length < 8 || password.length > 128) {
      return json(res, 400, {
        error: "Mật khẩu phải từ 8 đến 128 ký tự.",
      });
    }
    if (db.users.some((user) => user.email === email)) {
      return json(res, 409, { error: "Email đã tồn tại." });
    }

    const id = randomUUID();
    const salt = randomBytes(16).toString("hex");
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
    const rate = consumeRateLimit(`login:${clientKey(req)}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (
      rateLimited(
        res,
        rate,
        "Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau.",
      )
    ) {
      return;
    }

    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const password = String(body.password || "");
    if (password.length > 128) {
      return json(res, 401, { error: "Email hoặc mật khẩu không đúng." });
    }

    const user = db.users.find((item) => item.email === email);
    if (!verifyPassword(password, user)) {
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
      revokeSession(db, sessionToken);
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

    if (body?.action && body.action !== "select") {
      const mutationRate = consumeRateLimit(
        `mutation:${user?.id || clientKey(req)}`,
        { limit: 120, windowMs: 10 * 60 * 1000 },
      );
      if (
        rateLimited(
          res,
          mutationRate,
          "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
        )
      ) {
        return;
      }
    }

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
      const requested = safeUploadPath(body.path);
      const uploadRate = consumeRateLimit(`upload:${user.id}`, {
        limit: 30,
        windowMs: 10 * 60 * 1000,
      });
      if (
        rateLimited(
          res,
          uploadRate,
          "Bạn tải ảnh lên quá nhanh. Vui lòng thử lại sau.",
        )
      ) {
        return;
      }

      const { buffer, extension } = validateImageUpload(requested, body.data);
      const relative = `${user.id}/${randomUUID()}${extension}`;
      const full = join(UPLOAD_DIR, relative);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, buffer);
      return json(res, 201, { path: relative, url: `/uploads/${relative}` });
    } catch (error) {
      return json(res, error.status || 400, { error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/rpc/")) {
    const user = requireUser(req, res, db);
    if (!user) return;

    const rpcRate = consumeRateLimit(`rpc:${user.id}`, {
      limit: 90,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited(res, rpcRate, "Bạn thao tác quá nhanh. Vui lòng thử lại sau.")) {
      return;
    }

    const name = decodeURIComponent(url.pathname.slice("/api/rpc/".length));
    const body = await readBody(req);
    const pet = db.pets.find((item) => item.id === body.p_case_id);

    if (name === "claim_rescue_case") {
      if (
        !pet ||
        pet.category !== "rescue" ||
        pet.rescuer_id ||
        isClosedPet(pet)
      ) {
        return json(res, 200, { data: false });
      }
      pet.rescuer_id = user.id;
      pet.updated_at = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { data: true });
    }

    if (name === "update_rescue_support_info") {
      if (
        !pet ||
        pet.category !== "rescue" ||
        pet.rescuer_id !== user.id ||
        isClosedPet(pet)
      ) {
        return json(res, 200, { data: false });
      }

      pet.bank_account_number =
        cleanText(body.p_bank_account_number, 64) || null;
      pet.bank_account_name =
        cleanText(body.p_bank_account_name, 120) || null;
      pet.bank_name = cleanText(body.p_bank_name, 120) || null;
      pet.updated_at = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { data: true });
    }

    if (name === "close_rescue_case_simple") {
      if (
        !pet ||
        pet.category !== "rescue" ||
        isClosedPet(pet) ||
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
