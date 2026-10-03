import { cleanPublicUrl } from "./validation.js";

const FILTER_OPS = new Set(["eq", "neq", "is", "in", "gte", "lte"]);
const BLOCKED_COLUMNS = new Set(["__proto__", "prototype", "constructor"]);
const TABLE_FILTER_COLUMNS = {
  profiles: new Set(["id"]),
  pets: new Set([
    "id",
    "owner_id",
    "rescuer_id",
    "category",
    "status",
    "district",
    "animal",
    "color",
    "lat",
    "lng",
    "created_at",
    "updated_at",
  ]),
  rescue_appeals: new Set([
    "id",
    "case_id",
    "rescuer_id",
    "status",
    "created_at",
  ]),
  rescue_updates: new Set([
    "id",
    "case_id",
    "rescuer_id",
    "created_at",
  ]),
};
const TABLE_ORDER_COLUMNS = {
  profiles: new Set(["created_at", "updated_at", "display_name"]),
  pets: new Set(["created_at", "updated_at", "name", "status", "district"]),
  rescue_appeals: new Set(["created_at", "updated_at"]),
  rescue_updates: new Set(["created_at", "updated_at", "spent_cost"]),
};

export function queryError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function assertColumn(column) {
  if (
    typeof column !== "string" ||
    !column ||
    column.length > 80 ||
    BLOCKED_COLUMNS.has(column)
  ) {
    throw queryError("Invalid query column");
  }
}

export function validateFilters(table, filters) {
  if (!Array.isArray(filters) || filters.length > 20) {
    throw queryError("Invalid filters");
  }

  for (const filter of filters) {
    if (!filter || typeof filter !== "object") {
      throw queryError("Invalid filter");
    }
    assertColumn(filter.column);
    if (!TABLE_FILTER_COLUMNS[table]?.has(filter.column)) {
      throw queryError("Filter column is not allowed");
    }
    if (!FILTER_OPS.has(filter.op)) {
      throw queryError("Invalid filter operator");
    }
    if (filter.op === "in" && !Array.isArray(filter.value)) {
      throw queryError("Invalid in filter");
    }
  }
}

export function applyFilters(rows, filters = []) {
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

export function decorateRows(table, rows, columns, db) {
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
            avatar_url: (() => {
              try {
                return cleanPublicUrl(profile.avatar_url);
              } catch {
                return null;
              }
            })(),
          }
        : null,
    };
  });
}

export function tableRows(db, table) {
  const allowed = ["profiles", "pets", "rescue_appeals", "rescue_updates"];
  return allowed.includes(table) ? db[table] : null;
}

export function isExactIdQuery(filters) {
  return filters.some(
    (filter) =>
      filter.op === "eq" &&
      filter.column === "id" &&
      typeof filter.value === "string" &&
      filter.value.length > 0,
  );
}

export function assertObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw queryError("Invalid payload");
  }
  return value;
}

export function validateOrder(table, order) {
  if (!order?.column) return;
  assertColumn(order.column);
  if (!TABLE_ORDER_COLUMNS[table]?.has(order.column)) {
    throw queryError("Order column is not allowed");
  }
}

export function validateColumns(columns) {
  if (columns == null) return;
  if (typeof columns !== "string" || columns.length > 500) {
    throw queryError("Invalid columns");
  }
}
