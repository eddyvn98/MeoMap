import { createHash, randomBytes, scryptSync } from "node:crypto";
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

export function hashSessionToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

function matchesSessionToken(session, token) {
  if (!token) return false;
  if (session.token_hash) {
    return session.token_hash === hashSessionToken(token);
  }
  return session.token === token;
}

export function createSession(db, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;

  db.sessions = db.sessions.filter(
    (session) => new Date(session.expires_at).getTime() > Date.now(),
  );

  const ownSessions = db.sessions
    .filter((session) => session.user_id === userId)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const excess = Math.max(0, ownSessions.length - 9);
  if (excess) {
    const remove = new Set(ownSessions.slice(0, excess));
    db.sessions = db.sessions.filter((session) => !remove.has(session));
  }

  db.sessions.push({
    token_hash: hashSessionToken(token),
    user_id: userId,
    created_at: new Date().toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  });
  return token;
}

export function revokeSession(db, token) {
  db.sessions = db.sessions.filter(
    (session) => !matchesSessionToken(session, token),
  );
}

export function authUser(req, db) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const session = db.sessions.find(
    (item) =>
      matchesSessionToken(item, token) &&
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
