import { randomUUID } from "node:crypto";
import { writeDb } from "./db.js";
import { assertProfileSelectAllowed, publicProfile, validatePetInsert, validatePetUpdate } from "./validation.js";

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
            name: profile.display_name || profile.name || "",
            display_name: profile.display_name || profile.name || "",
            avatar_url: profile.avatar_url || null,
          }
        : null,
    };
  });
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
  ) {
    return true;
  }

  if (
    row.category === "rescue" &&
    row.rescuer_id === user.id &&
    keys.every((key) =>
      ["bank_account_number", "bank_account_name", "bank_name", "bank_qr_code_url"].includes(key),
    )
  ) {
    return true;
  }

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
      const pet = db.pets.find((item) => item.id === payload.case_id);
      return !!pet && pet.rescuer_id === user.id;
    }
    return row?.rescuer_id === user.id;
  }

  return false;
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
  } = body;

  const rows = tableRows(db, table);
  if (!rows) throw Object.assign(new Error("Unknown table"), { status: 400 });

  if (action === "select") {
    if (table === "profiles") {
      assertProfileSelectAllowed(filters, user);
    }
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
    if (table === "profiles") {
      result = result.map((profile) => publicProfile(profile, user));
    }

    if (single === "single") {
      if (result.length !== 1) {
        throw Object.assign(new Error("Expected one row"), { status: 406 });
      }
      return result[0];
    }
    if (single === "maybeSingle") return result[0] || null;
    return result;
  }

  if (!user) {
    throw Object.assign(new Error("Bạn cần đăng nhập."), { status: 401 });
  }

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

        const existingIndex = rows.findIndex((row) => row.id === item.id);
        item = {
          id: user.id,
          email: user.email,
          display_name:
            item.display_name ||
            user.user_metadata?.full_name ||
            user.email.split("@")[0],
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
        validatePetInsert(item);
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
  if (!filters.length) {
    throw Object.assign(new Error("Mutation requires filters"), { status: 400 });
  }

  if (action === "update") {
    const safePayload = table === "pets" ? validatePetUpdate(payload || {}) : (payload || {});
    const changed = [];
    for (const row of matched) {
      if (!authorizeMutation(table, "update", user, row, safePayload, db)) {
        throw Object.assign(new Error("Không có quyền cập nhật."), { status: 403 });
      }
      Object.assign(row, safePayload, { updated_at: new Date().toISOString() });
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
