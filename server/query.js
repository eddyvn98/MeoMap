import { randomUUID } from "node:crypto";
import { writeDb } from "./db.js";
import {
  OWNER_PET_UPDATE_FIELDS,
  RESCUER_SUPPORT_FIELDS,
  assertProfileSelectAllowed,
  publicPet,
  publicProfile,
  publicRescueRecord,
  sanitizePetInsert,
  sanitizePetUpdate,
  sanitizeProfileInput,
  sanitizeRescueRecord,
} from "./validation.js";

const FILTER_OPS = new Set(["eq", "neq", "is", "in", "gte", "lte"]);
const BLOCKED_COLUMNS = new Set(["__proto__", "prototype", "constructor"]);

function queryError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function assertColumn(column) {
  if (
    typeof column !== "string" ||
    !column ||
    column.length > 80 ||
    BLOCKED_COLUMNS.has(column)
  ) {
    throw queryError("Invalid query column");
  }
}

function validateFilters(filters) {
  if (!Array.isArray(filters) || filters.length > 20) {
    throw queryError("Invalid filters");
  }
  for (const filter of filters) {
    if (!filter || typeof filter !== "object") throw queryError("Invalid filter");
    assertColumn(filter.column);
    if (!FILTER_OPS.has(filter.op)) throw queryError("Invalid filter operator");
    if (filter.op === "in" && !Array.isArray(filter.value)) {
      throw queryError("Invalid in filter");
    }
  }
}

function applyFilters(rows, filters = []) {
  return rows.filter((row) =>
    filters.every(({ op, column, value }) => {
      const current = row?.[column];
      if (op === "eq") return current === value;
      if (op === "neq") return current !== value;
      if (op === "is") return value === null ? current == null : current === value;
      if (op === "in") return value.includes(current);
      if (op === "gte") return current >= value;
      return current <= value;
    }),
  );
}

function decorateRows(table, rows, columns, db) {
  if (table !== "pets" || !String(columns || "").includes("profiles(")) {
    return rows;
  }

  return rows.map((row) => {
    const profile = db.profiles.find((item) => item.id === row.owner_id);
    return {
      ...row,
      profiles: profile
        ? {
            id: profile.id,
            name: profile.display_name || "",
            display_name: profile.display_name || "",
            avatar_url: profile.avatar_url || null,
          }
        : null,
    };
  });
}

function tableRows(db, table) {
  if (!["profiles", "pets", "rescue_appeals", "rescue_updates"].includes(table)) {
    return null;
  }
  return db[table];
}

function isExactIdQuery(filters) {
  return filters.some(
    (filter) =>
      filter.op === "eq" &&
      filter.column === "id" &&
      typeof filter.value === "string" &&
      filter.value.length > 0,
  );
}

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

  if (table === "profiles") {
    return !row || row.id === user.id;
  }

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

function assertObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw queryError("Invalid payload");
  }
  return value;
}

export function executeQuery(body, user, db) {
  const {
    table,
    action = "select",
    filters = [],
    order,
    limit,
    payload,
    single,
    columns,
  } = body || {};

  const rows = tableRows(db, table);
  if (!rows) throw queryError("Unknown table");
  validateFilters(filters);

  if (action === "select") {
    if (table === "profiles") assertProfileSelectAllowed(filters);
    if (order?.column) assertColumn(order.column);

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
    } else if (
      table === "rescue_appeals" ||
      table === "rescue_updates"
    ) {
      result = result.map((row) => publicRescueRecord(table, row));
    }

    result = decorateRows(table, result, columns, db);

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

  if (!filters.length) throw queryError("Mutation requires filters");
  const matched = applyFilters(rows, filters);

  if (action === "update") {
    const raw = assertObject(payload || {});
    const changed = [];

    for (const row of matched) {
      let next;
      if (table === "pets") next = sanitizePetUpdate(raw);
      else if (table === "profiles") next = sanitizeProfileInput(raw);
      else next = sanitizeRescueRecord(table, { ...row, ...raw });

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

  if (action === "delete") {
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

  throw queryError("Unsupported action");
}
