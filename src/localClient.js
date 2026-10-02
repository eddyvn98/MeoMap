const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const TOKEN_KEY = "meomap_local_token";
const listeners = new Set();

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function emitAuth(event, user) {
  const session = user ? { user, access_token: token() } : null;
  window.dispatchEvent(new CustomEvent("meomap-auth-change", { detail: { event, session } }));
  for (const listener of listeners) listener(event, session);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false && token()) headers.Authorization = `Bearer ${token()}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Không đọc được file"));
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.readAsDataURL(file);
  });
}

class QueryBuilder {
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

const auth = {
  async signUp({ email, password, options = {} }) {
    try {
      const result = await request("/api/auth/signup", {
        method: "POST",
        auth: false,
        body: { email, password, full_name: options?.data?.full_name || "" },
      });
      localStorage.setItem(TOKEN_KEY, result.token);
      emitAuth("SIGNED_IN", result.user);
      return { data: { user: result.user, session: { user: result.user, access_token: result.token } }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error };
    }
  },

  async signInWithPassword({ email, password }) {
    try {
      const result = await request("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      localStorage.setItem(TOKEN_KEY, result.token);
      emitAuth("SIGNED_IN", result.user);
      return { data: { user: result.user, session: { user: result.user, access_token: result.token } }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error };
    }
  },

  async signOut() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      // Clearing local auth is sufficient even if the server is restarting.
    }
    localStorage.removeItem(TOKEN_KEY);
    emitAuth("SIGNED_OUT", null);
    return { error: null };
  },

  async getUser() {
    if (!token()) return { data: { user: null }, error: null };
    try {
      const result = await request("/api/auth/me");
      return { data: { user: result.user }, error: null };
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        return { data: { user: null }, error: null };
      }
      return { data: { user: null }, error };
    }
  },

  async getSession() {
    const { data, error } = await this.getUser();
    return {
      data: { session: data.user ? { user: data.user, access_token: token() } : null },
      error,
    };
  },

  onAuthStateChange(callback) {
    const wrapped = (event, session) => callback(event, session);
    listeners.add(wrapped);
    return {
      data: {
        subscription: {
          unsubscribe() {
            listeners.delete(wrapped);
          },
        },
      },
    };
  },

  onAuthStateChanged(callback) {
    const wrapped = (_event, session) => callback(session);
    listeners.add(wrapped);
    return {
      data: {
        subscription: {
          unsubscribe() {
            listeners.delete(wrapped);
          },
        },
      },
    };
  },
};

const storage = {
  from() {
    return {
      async upload(path, file) {
        try {
          const data = await fileToBase64(file);
          const result = await request("/api/upload", {
            method: "POST",
            body: {
              path,
              contentType: file.type || "application/octet-stream",
              data,
            },
          });
          return { data: { path: result.path }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      getPublicUrl(path) {
        const safePath = String(path)
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/");
        return { data: { publicUrl: `${API_BASE}/uploads/${safePath}` } };
      },
    };
  },
};

export const localApi = {
  auth,
  storage,
  from(table) {
    return new QueryBuilder(table);
  },
  async rpc(name, args = {}) {
    try {
      const result = await request(`/api/rpc/${encodeURIComponent(name)}`, {
        method: "POST",
        body: args,
      });
      return { data: result.data ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
