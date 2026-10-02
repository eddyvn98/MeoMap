import { request } from "./request.js";

export class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = "select";
    this.columns = "*";
    this.filters = [];
    this.orderBy = null;
    this.maxRows = null;
    this.payload = null;
    this.singleMode = null;
  }

  select(columns = "*") {
    this.columns = columns;
    return this;
  }

  insert(values) {
    this.action = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values) {
    this.action = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(values) {
    this.action = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }

  is(column, value) {
    this.filters.push({ op: "is", column, value });
    return this;
  }

  in(column, value) {
    this.filters.push({ op: "in", column, value });
    return this;
  }

  gte(column, value) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }

  lte(column, value) {
    this.filters.push({ op: "lte", column, value });
    return this;
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(value) {
    this.maxRows = Number(value);
    return this;
  }

  async single() {
    this.singleMode = "single";
    return this.execute();
  }

  async maybeSingle() {
    this.singleMode = "maybeSingle";
    return this.execute();
  }

  async execute() {
    try {
      const result = await request("/api/query", {
        method: "POST",
        body: {
          table: this.table,
          action: this.action,
          columns: this.columns,
          filters: this.filters,
          order: this.orderBy,
          limit: this.maxRows,
          payload: this.payload,
          single: this.singleMode,
        },
      });
      return { data: result.data ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}
