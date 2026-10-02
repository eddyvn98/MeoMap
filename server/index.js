import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "db.json");
const UPLOAD_DIR = join(DATA_DIR, "uploads");
const DIST_DIR = join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);
const SESSION_DAYS = 30;

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });

function emptyDb() {
  return {
    users: [],
    profiles: [],
    pets: [],
    rescue_appeals: [],
    rescue_updates: [],
    sessions: [],
  };
}

if (!existsSync(DB_FILE)) writeFileSync(DB_FILE, JSON.stringify(emptyDb(), null, 2));

function readDb() {
  try {
    const db = JSON.parse(readFileSync(DB_FILE, "utf8"));
    return { ...emptyDb(), ...db };
  } catch {
    return emptyDb();
  }
}

function writeDb(db) {
  const temp = `${DB_FILE}.tmp`;
  writeFileSync(temp, JSON.stringify(db, null, 2));
  renameSync(temp, DB_FILE);
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readBody(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolveBody, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolveBody({});
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
    created_at: user.created_at,
  };
}

function createSession(db, userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.sessions = db.sessions.filter((s) => new Date(s.expires_at).getTime() > Date.now());
  db.sessions.push({
    token,
    user_id: userId,
    created_at: new Date().toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  });
  return token;
}

function authUser(req, db) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const session = db.sessions.find(
    (s) => s.token === token && new Date(s.expires_at).getTime() > Date.now(),
  );
  if (!session) return null;
  return db.users.find((u) => u.id === session.user_id) || null;
}

function requireUser(req, res, db) {
  const user = authUser(req, db);
  if (!user) {
    json(res, 401, { error: "Bạn cần đăng nhập." });
    return null;
  }
  return user;
}

function applyFilters(rows, filters = []) {
  return rows.filter((row) =>
    filters.every(({ op, column, value }) => {
      const current = row?.[column];
      if (op === "eq") return current === value;
      if (op === "neq") return current !== value;
      if (op === "is") return value === null ? current == null : current === value;
      if (op === "in") return Array.isArray(value) && value.includes(current);
      if (op === "gte") return current >= value;
      if (op === "lte") return current <= value;
      return true;
    }),
  );
}

function decorateRows(table, rows, columns, db) {
  if (table === "pets" && String(columns || "").includes("profiles(")) {
    return rows.map((row) => {
      const p = db.profiles.find((profile) => profile.id === row.owner_id);
      return {
        ...row,
        profiles: p ? { ...p, name: p.display_name || p.name || "" } : null,
      };
    });
  }
  return rows;
}

function tableRows(db, table) {
  const allowed = ["profiles", "pets", "rescue_appeals", "rescue_updates"];
  if (!allowed.includes(table)) return null;
  return db[table];
}

function canUpdatePet(user, row, payload) {
  if (row.owner_id === user.id) return true;
  const keys = Object.keys(payload || {}).filter((key) => key !== "updated_at");
  if (
    row.category === "rescue" &&
    !row.rescuer_id &&
    keys.length === 1 &&
    keys[0] === "rescuer_id" &&
    payload.rescuer_id === user.id
  ) return true;
  if (
    row.category === "rescue" &&
    row.rescuer_id === user.id &&
    keys.every((key) =>
      ["bank_account_number", "bank_account_name", "bank_name", "bank_qr_code_url"].includes(key),
    )
  ) return true;
  return false;
}

function authorizeMutation(table, action, user, row, payload, db) {
  if (!user) return false;

  if (table === "profiles") {
    const targetId = row?.id || payload?.id || user.id;
    return targetId === user.id;
  }

  if (table === "pets") {
    if (action === "insert") return true;
    if (!row) return false;
    if (action === "delete") return row.owner_id === user.id;
    return canUpdatePet(user, row, payload);
  }

  if (table === "rescue_appeals" || table === "rescue_updates") {
    if (action === "insert") {
      const pet = db.pets.find((p) => p.id === payload.case_id);
      return !!pet && pet.rescuer_id === user.id;
    }
    return row?.rescuer_id === user.id;
  }

  return false;
}

function executeQuery(body, user, db) {
  const { table, action = "select", filters = [], order, limit, payload, single, columns } = body;
  const rows = tableRows(db, table);
  if (!rows) throw Object.assign(new Error("Unknown table"), { status: 400 });

  if (action === "select") {
    let result = applyFilters([...rows], filters);
    if (order?.column) {
      const direction = order.ascending === false ? -1 : 1;
      result.sort((a, b) => {
        const av = a?.[order.column];
        const bv = b?.[order.column];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return av > bv ? direction : -direction;
      });
    }
    if (Number.isFinite(limit)) result = result.slice(0, limit);
    result = decorateRows(table, result, columns, db);
    if (single === "single") {
      if (result.length !== 1) throw Object.assign(new Error("Expected one row"), { status: 406 });
      return result[0];
    }
    if (single === "maybeSingle") return result[0] || null;
    return result;
  }

  if (!user) throw Object.assign(new Error("Bạn cần đăng nhập."), { status: 401 });

  if (action === "insert" || action === "upsert") {
    const values = Array.isArray(payload) ? payload : [payload];
    const created = [];

    for (const raw of values) {
      const now = new Date().toISOString();
      let item = { ...(raw || {}) };

      if (table === "profiles") {
        item.id = item.id || user.id;
        if (!authorizeMutation(table, "insert", user, null, item, db)) {
          throw Object.assign(new Error("Không có quyền."), { status: 403 });
        }
        const existingIndex = rows.findIndex((r) => r.id === item.id);
        item = {
          id: user.id,
          email: user.email,
          display_name: item.display_name || user.user_metadata?.full_name || user.email.split("@")[0],
          avatar_url: item.avatar_url || null,
          phone: item.phone || null,
          zalo: item.zalo || null,
          role: item.role || "user",
          created_at: rows[existingIndex]?.created_at || now,
          updated_at: now,
          ...rows[existingIndex],
          ...item,
        };
        if (existingIndex >= 0) rows[existingIndex] = item;
        else rows.push(item);
        created.push(item);
        continue;
      }

      if (table === "pets") {
        item.owner_id = user.id;
        item.id = item.id || randomUUID();
        item.status = item.status || "available";
        item.category = item.category || "lost";
        item.created_at = item.created_at || now;
        item.updated_at = now;
      } else {
        item.id = item.id || randomUUID();
        item.rescuer_id = user.id;
        item.created_at = item.created_at || now;
        item.updated_at = now;
      }

      if (!authorizeMutation(table, "insert", user, null, item, db)) {
        throw Object.assign(new Error("Không có quyền."), { status: 403 });
      }
      rows.push(item);
      created.push(item);
    }

    writeDb(db);
    return single ? created[0] || null : created;
  }

  const matched = applyFilters(rows, filters);
  if (!filters.length) throw Object.assign(new Error("Mutation requires filters"), { status: 400 });

  if (action === "update") {
    const changed = [];
    for (const row of matched) {
      if (!authorizeMutation(table, "update", user, row, payload || {}, db)) {
        throw Object.assign(new Error("Không có quyền cập nhật."), { status: 403 });
      }
      Object.assign(row, payload || {}, { updated_at: new Date().toISOString() });
      changed.push(row);
    }
    writeDb(db);
    return single ? changed[0] || null : changed;
  }

  if (action === "delete") {
    for (const row of matched) {
      if (!authorizeMutation(table, "delete", user, row, null, db)) {
        throw Object.assign(new Error("Không có quyền xóa."), { status: 403 });
      }
    }
    const ids = new Set(matched.map((row) => row.id));
    db[table] = rows.filter((row) => !ids.has(row.id));
    writeDb(db);
    return matched;
  }

  throw Object.assign(new Error("Unsupported action"), { status: 400 });
}

function safeUploadPath(input) {
  const parts = String(input || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"));
  if (!parts.length) throw new Error("Invalid upload path");
  return parts.join("/");
}

function mimeType(path) {
  const ext = extname(path).toLowerCase();
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".css": "text/css",
    ".js": "text/javascript",
    ".html": "text/html",
    ".json": "application/json",
  }[ext] || "application/octet-stream";
}

function serveFile(res, path) {
  if (!existsSync(path) || !statSync(path).isFile()) return false;
  res.writeHead(200, { "Content-Type": mimeType(path), "Cache-Control": "no-cache" });
  createReadStream(path).pipe(res);
  return true;
}

async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, storage: "local-json" });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const password = String(body.password || "");
    if (!email || !email.includes("@")) return json(res, 400, { error: "Email không hợp lệ." });
    if (password.length < 6) return json(res, 400, { error: "Mật khẩu phải ít nhất 6 ký tự." });
    if (db.users.some((u) => u.email === email)) return json(res, 409, { error: "Email đã tồn tại." });

    const id = randomUUID();
    const salt = randomBytes(16).toString("hex");
    const fullName = String(body.full_name || "").trim();
    const user = {
      id,
      email,
      password_salt: salt,
      password_hash: hashPassword(password, salt),
      user_metadata: { full_name: fullName },
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const sessionToken = createSession(db, id);
    writeDb(db);
    return json(res, 201, { user: safeUser(user), token: sessionToken });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(req);
    const email = cleanEmail(body.email);
    const user = db.users.find((u) => u.email === email);
    if (!user) return json(res, 401, { error: "Email hoặc mật khẩu không đúng." });

    const actual = Buffer.from(hashPassword(String(body.password || ""), user.password_salt), "hex");
    const expected = Buffer.from(user.password_hash, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
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
      db.sessions = db.sessions.filter((s) => s.token !== sessionToken);
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
      const data = executeQuery(body, user, db);
      return json(res, 200, { data });
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
    const caseId = body.p_case_id;
    const pet = db.pets.find((p) => p.id === caseId);

    if (name === "claim_rescue_case") {
      if (!pet || pet.category !== "rescue" || pet.rescuer_id || ["closed", "delivered", "completed"].includes(pet.status)) {
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
      pet.bank_account_number = String(body.p_bank_account_number || "").trim() || null;
      pet.bank_account_name = String(body.p_bank_account_name || "").trim() || null;
      pet.bank_name = String(body.p_bank_name || "").trim() || null;
      pet.updated_at = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { data: true });
    }

    if (name === "close_rescue_case_simple") {
      if (!pet || pet.category !== "rescue" || (pet.owner_id !== user.id && pet.rescuer_id !== user.id)) {
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    });
    return res.end();
  }

  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);

    if (url.pathname.startsWith("/uploads/")) {
      const relative = safeUploadPath(decodeURIComponent(url.pathname.slice("/uploads/".length)));
      const full = normalize(join(UPLOAD_DIR, relative));
      if (!full.startsWith(normalize(UPLOAD_DIR))) return json(res, 403, { error: "Forbidden" });
      if (serveFile(res, full)) return;
      return json(res, 404, { error: "File not found" });
    }

    if (existsSync(DIST_DIR)) {
      const requested = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
      const candidate = normalize(join(DIST_DIR, requested));
      if (candidate.startsWith(normalize(DIST_DIR)) && serveFile(res, candidate)) return;
      if (serveFile(res, join(DIST_DIR, "index.html"))) return;
    }

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("MeoMap local API is running. Run npm run dev for the web UI.");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: error.message || "Internal server error" });
    else res.end();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MeoMap local server: http://localhost:${PORT}`);
});
