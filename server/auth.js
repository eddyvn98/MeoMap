import { randomBytes, scryptSync } from "node:crypto";
import { SESSION_DAYS } from "./config.js";
import { json } from "./http.js";

export function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
    created_at: user.created_at,
  };
}

export function createSession(db, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.sessions = db.sessions.filter(
    (session) => new Date(session.expires_at).getTime() > Date.now(),
  );
  db.sessions.push({
    token,
    user_id: userId,
    created_at: new Date().toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  });
  return token;
}

export function authUser(req, db) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const session = db.sessions.find(
    (item) =>
      item.token === token &&
      new Date(item.expires_at).getTime() > Date.now(),
  );
  if (!session) return null;
  return db.users.find((user) => user.id === session.user_id) || null;
}

export function requireUser(req, res, db) {
  const user = authUser(req, db);
  if (!user) {
    json(res, 401, { error: "Bạn cần đăng nhập." });
    return null;
  }
  return user;
}
