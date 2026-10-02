import { auth } from "./api/local/auth.js";
import { QueryBuilder } from "./api/local/query.js";
import { request } from "./api/local/request.js";
import { storage } from "./api/local/storage.js";

export const localApi = {
  auth,
  storage,

  from(table) {
    return new QueryBuilder(table);
  },

  async rpc(name, args = {}) {
    try {
      const result = await request(
        `/api/rpc/${encodeURIComponent(name)}`,
        { method: "POST", body: args },
      );
      return { data: result.data ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
