import {
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { clientKey, consumeRateLimit } from "./security.js";
import {
  cleanEmail,
  createSession,
  hashPassword,
  requireUser,
  revokeSession,
  safeUser,
} from "./auth.js";
import { json, readBody } from "./http.js";
import { writeDb } from "./db.js";
import { cleanText } from "./validation.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

async function signup(req, res, db) {
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
    return json(res, 400, { error: "Mật khẩu phải từ 8 đến 128 ký tự." });
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

  const token = createSession(db, id);
  writeDb(db);
  return json(res, 201, { user: safeUser(user), token });
}

async function login(req, res, db) {
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

  const token = createSession(db, user.id);
  writeDb(db);
  return json(res, 200, { user: safeUser(user), token });
}

function logout(req, res, db) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    revokeSession(db, token);
    writeDb(db);
  }
  return json(res, 200, { ok: true });
}

export async function handleAuthRoute(req, res, url, db) {
  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    await signup(req, res, db);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    await login(req, res, db);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    logout(req, res, db);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = requireUser(req, res, db);
    if (user) json(res, 200, { user: safeUser(user) });
    return true;
  }
  return false;
}
