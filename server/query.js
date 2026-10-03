import { randomUUID } from "node:crypto";
import { writeDb } from "./db.js";
import {
  OWNER_PET_UPDATE_FIELDS,
  RESCUER_SUPPORT_FIELDS,
  assertProfileSelectAllowed,
  sanitizePetInsert,
  sanitizePetUpdate,
  sanitizeProfileInput,
  sanitizeRescueRecord,
} from "./validation.js";
import {
  publicPet,
  publicProfile,
  publicRescueRecord,
} from "./publicData.js";
import {
  applyFilters,
  assertObject,
  decorateRows,
  isExactIdQuery,
  queryError,
  tableRows,
  validateColumns,
  validateFilters,
  validateOrder,
} from "./queryHelpers.js";

function canUpdatePet(user, row, payload) {
  const keys = Object.keys(payload || {}).filter((key) => key !== "updated_at");

  if (row.owner_id === user.id) {
    if (!keys.every((key) => OWNER_PET_UPDATE_FIELDS.has(key))) return false;
    if (
      row.category === "rescue" &&
      row.rescuer_id &&
      payload.category &&
      payload.category !== "rescue"
    ) {
      return false;
    }
    return true;
  }

  if (
    row.category === "rescue" &&
    !row.rescuer_id &&
    keys.length === 1 &&
    keys[0] === "rescuer_id" &&
    payload.rescuer_id === user.id
  ) {
    return true;
  }

  return (
    row.category === "rescue" &&
    row.rescuer_id === user.id &&
    keys.length > 0 &&
    keys.every((key) => RESCUER_SUPPORT_FIELDS.has(key))
  );
}

function authorizeMutation(table, action, user, row, payload, db) {
  if (!user) return false;

  if (table === "profiles") return !row || row.id === user.id;

  if (table === "pets") {
    if (action === "insert") return true;
    if (!row) return false;
    if (action === "delete") return row.owner_id === user.id;
    return canUpdatePet(user, row, payload);
  }

  if (table === "rescue_appeals" || table === "rescue_updates") {
    if (action === "insert") {
      const pet = db.pets.find((item) => item.id === payload.case_id);
      return !!pet && pet.category === "rescue" && pet.rescuer_id === user.id;
    }
    return row?.rescuer_id === user.id;
  }

  return false;
}

function prepareProfile(raw, user, existing, now) {
  const input = sanitizeProfileInput(raw);
  return {
    id: user.id,
    email: user.email,
    display_name:
      input.display_name ||
      existing?.display_name ||
      user.user_metadata?.full_name ||
      user.email.split("@")[0],
    avatar_url: input.avatar_url ?? existing?.avatar_url ?? null,
    phone: input.phone ?? existing?.phone ?? null,
    zalo: input.zalo ?? existing?.zalo ?? null,
    role: existing?.role || "user",
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

function selectRows({ table, rows, filters, order, limit, columns }, user, db) {
  if (table === "profiles") assertProfileSelectAllowed(filters);
  validateOrder(table, order);

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

  const maxRows = Number.isFinite(limit)
    ? Math.max(0, Math.min(Number(limit), 500))
    : 500;
  result = result.slice(0, maxRows);

  if (table === "profiles") {
    result = result.map((profile) => publicProfile(profile, user));
  } else if (table === "pets") {
    const includePrivateContact = isExactIdQuery(filters);
    result = result.map((pet) => publicPet(pet, includePrivateContact));
  } else {
    result = result.map((row) => publicRescueRecord(table, row));
  }

  return decorateRows(table, result, columns, db);
}

function insertRows({ table, rows, payload, single }, user, db) {
  const values = Array.isArray(payload) ? payload : [payload];
  if (!values.length || values.length > 50) throw queryError("Invalid payload");

  const created = [];
  for (const rawValue of values) {
    const raw = assertObject(rawValue);
    const now = new Date().toISOString();
    let item;

    if (table === "profiles") {
      const existingIndex = rows.findIndex((row) => row.id === user.id);
      item = prepareProfile(raw, user, rows[existingIndex], now);
      if (existingIndex >= 0) rows[existingIndex] = item;
      else rows.push(item);
      created.push(item);
      continue;
    }

    if (table === "pets") {
      item = {
        ...sanitizePetInsert(raw),
        id: randomUUID(),
        owner_id: user.id,
        created_at: now,
        updated_at: now,
      };
    } else {
      item = {
        ...sanitizeRescueRecord(table, raw),
        id: randomUUID(),
        rescuer_id: user.id,
        created_at: now,
        updated_at: now,
      };
    }

    if (!authorizeMutation(table, "insert", user, null, item, db)) {
      throw queryError("Không có quyền.", 403);
    }
    rows.push(item);
    created.push(item);
  }

  writeDb(db);
  return single ? created[0] || null : created;
}

function updateRows({ table, rows, filters, payload, single }, user, db) {
  const raw = assertObject(payload || {});
  const matched = applyFilters(rows, filters);
  const changed = [];

  for (const row of matched) {
    let next;
    if (table === "pets") next = sanitizePetUpdate(raw);
    else if (table === "profiles") next = sanitizeProfileInput(raw);
    else {
      next = sanitizeRescueRecord(table, {
        ...row,
        ...raw,
        case_id: row.case_id,
      });
    }

    if (!authorizeMutation(table, "update", user, row, next, db)) {
      throw queryError("Không có quyền cập nhật.", 403);
    }

    if (table === "profiles") {
      Object.assign(row, next, {
        id: user.id,
        email: user.email,
        role: row.role || "user",
        updated_at: new Date().toISOString(),
      });
    } else {
      Object.assign(row, next, { updated_at: new Date().toISOString() });
    }
    changed.push(row);
  }

  writeDb(db);
  return single ? changed[0] || null : changed;
}

function deleteRows({ table, rows, filters }, user, db) {
  const matched = applyFilters(rows, filters);
  for (const row of matched) {
    if (!authorizeMutation(table, "delete", user, row, null, db)) {
      throw queryError("Không có quyền xóa.", 403);
    }
  }

  const ids = new Set(matched.map((row) => row.id));
  db[table] = rows.filter((row) => !ids.has(row.id));

  if (table === "pets") {
    db.rescue_appeals = db.rescue_appeals.filter(
      (row) => !ids.has(row.case_id),
    );
    db.rescue_updates = db.rescue_updates.filter(
      (row) => !ids.has(row.case_id),
    );
  }

  writeDb(db);
  return matched;
}

export function executeQuery(body, user, db) {
  const request = body || {};
  const {
    table,
    action = "select",
    filters = [],
    order,
    limit,
    payload,
    single,
    columns,
  } = request;

  const rows = tableRows(db, table);
  if (!rows) throw queryError("Unknown table");
  validateFilters(table, filters);
  validateColumns(columns);

  if (action === "select") {
    const result = selectRows(
      { table, rows, filters, order, limit, columns },
      user,
      db,
    );
    if (single === "single") {
      if (result.length !== 1) throw queryError("Expected one row", 406);
      return result[0];
    }
    if (single === "maybeSingle") return result[0] || null;
    return result;
  }

  if (!user) throw queryError("Bạn cần đăng nhập.", 401);
  if (action === "upsert" && table !== "profiles") {
    throw queryError("Upsert chỉ hỗ trợ profiles.");
  }

  if (action === "insert" || action === "upsert") {
    return insertRows({ table, rows, payload, single }, user, db);
  }

  if (!filters.length) throw queryError("Mutation requires filters");
  if (action === "update") {
    return updateRows({ table, rows, filters, payload, single }, user, db);
  }
  if (action === "delete") {
    return deleteRows({ table, rows, filters }, user, db);
  }

  throw queryError("Unsupported action");
}
