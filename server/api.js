import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { clientKey, consumeRateLimit, validateImageUpload } from "./security.js";
import { UPLOAD_DIR } from "./config.js";
import { readDb, writeDb } from "./db.js";
import { authUser, requireUser } from "./auth.js";
import { json, readBody, safeUploadPath } from "./http.js";
import { executeQuery } from "./query.js";
import { deleteOwnedUpload } from "./uploadFiles.js";
import { cleanText } from "./validation.js";
import { handleAuthRoute } from "./authRoutes.js";

const CLOSED_STATUSES = new Set([
  "closed",
  "delivered",
  "completed",
  "Found",
]);

function isClosedPet(pet) {
  return CLOSED_STATUSES.has(String(pet?.status || ""));
}

function rateLimited(res, rate, message) {
  if (rate.allowed) return false;
  res.setHeader("Retry-After", String(rate.retryAfter));
  json(res, 429, { error: message });
  return true;
}

function previousPetImage(body, db) {
  if (
    body?.table !== "pets" ||
    body?.action !== "update" ||
    !Object.prototype.hasOwnProperty.call(body?.payload || {}, "image_url")
  ) {
    return null;
  }

  const idFilter = (body.filters || []).find(
    (filter) => filter.op === "eq" && filter.column === "id",
  );
  const pet = idFilter
    ? db.pets.find((item) => item.id === idFilter.value)
    : null;

  return pet
    ? { image: pet.image_url || null, ownerId: pet.owner_id || null }
    : null;
}

function cleanupPetUploads(body, data, previous, user) {
  if (
    previous?.image &&
    previous.image !== body?.payload?.image_url &&
    previous.ownerId === user?.id
  ) {
    deleteOwnedUpload(previous.image, previous.ownerId);
  }

  if (body?.table === "pets" && body?.action === "delete") {
    for (const deleted of data || []) {
      deleteOwnedUpload(deleted.image_url, deleted.owner_id);
    }
  }
}

async function handleQuery(req, res, db) {
  const body = await readBody(req);
  const user = authUser(req, db);

  if (body?.action && body.action !== "select") {
    const rate = consumeRateLimit(
      `mutation:${user?.id || clientKey(req)}`,
      { limit: 120, windowMs: 10 * 60 * 1000 },
    );
    if (
      rateLimited(
        res,
        rate,
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      )
    ) {
      return;
    }
  }

  try {
    const previous = previousPetImage(body, db);
    const data = executeQuery(body, user, db);
    cleanupPetUploads(body, data, previous, user);
    return json(res, 200, { data });
  } catch (error) {
    return json(res, error.status || 400, { error: error.message });
  }
}

async function handleUpload(req, res, db) {
  const user = requireUser(req, res, db);
  if (!user) return;

  try {
    const body = await readBody(req);
    const requested = safeUploadPath(body.path);
    const rate = consumeRateLimit(`upload:${user.id}`, {
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (
      rateLimited(
        res,
        rate,
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

function claimRescue(res, db, pet, user) {
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

function updateRescueSupport(res, db, pet, user, body) {
  if (
    !pet ||
    pet.category !== "rescue" ||
    pet.rescuer_id !== user.id ||
    isClosedPet(pet)
  ) {
    return json(res, 200, { data: false });
  }

  pet.bank_account_number = cleanText(body.p_bank_account_number, 64) || null;
  pet.bank_account_name = cleanText(body.p_bank_account_name, 120) || null;
  pet.bank_name = cleanText(body.p_bank_name, 120) || null;
  pet.updated_at = new Date().toISOString();
  writeDb(db);
  return json(res, 200, { data: true });
}

function closeRescue(res, db, pet, user) {
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

async function handleRpc(req, res, url, db) {
  const user = requireUser(req, res, db);
  if (!user) return;

  const rate = consumeRateLimit(`rpc:${user.id}`, {
    limit: 90,
    windowMs: 10 * 60 * 1000,
  });
  if (
    rateLimited(
      res,
      rate,
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    )
  ) {
    return;
  }

  const name = decodeURIComponent(url.pathname.slice("/api/rpc/".length));
  const body = await readBody(req);
  const pet = db.pets.find((item) => item.id === body.p_case_id);

  if (name === "claim_rescue_case") {
    return claimRescue(res, db, pet, user);
  }
  if (name === "update_rescue_support_info") {
    return updateRescueSupport(res, db, pet, user, body);
  }
  if (name === "close_rescue_case_simple") {
    return closeRescue(res, db, pet, user);
  }
  return json(res, 404, { error: "Unknown RPC" });
}

export async function handleApi(req, res, url) {
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, storage: "local-json" });
  }

  if (await handleAuthRoute(req, res, url, db)) return;

  if (req.method === "POST" && url.pathname === "/api/query") {
    return handleQuery(req, res, db);
  }
  if (req.method === "POST" && url.pathname === "/api/upload") {
    return handleUpload(req, res, db);
  }
  if (req.method === "POST" && url.pathname.startsWith("/api/rpc/")) {
    return handleRpc(req, res, url, db);
  }

  return json(res, 404, { error: "Not found" });
}
