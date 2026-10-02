import { getToken, request, setToken } from "./request.js";

const listeners = new Set();

function emitAuth(event, user) {
  const session = user ? { user, access_token: getToken() } : null;
  window.dispatchEvent(
    new CustomEvent("meomap-auth-change", { detail: { event, session } }),
  );
  for (const listener of listeners) listener(event, session);
}

export const auth = {
  async signUp({ email, password, options = {} }) {
    try {
      const result = await request("/api/auth/signup", {
        method: "POST",
        auth: false,
        body: {
          email,
          password,
          full_name: options?.data?.full_name || "",
        },
      });
      setToken(result.token);
      emitAuth("SIGNED_IN", result.user);
      return {
        data: {
          user: result.user,
          session: { user: result.user, access_token: result.token },
        },
        error: null,
      };
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
      setToken(result.token);
      emitAuth("SIGNED_IN", result.user);
      return {
        data: {
          user: result.user,
          session: { user: result.user, access_token: result.token },
        },
        error: null,
      };
    } catch (error) {
      return { data: { user: null, session: null }, error };
    }
  },

  async signOut() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      // Local token removal is enough if the server is unavailable.
    }

    setToken("");
    emitAuth("SIGNED_OUT", null);
    return { error: null };
  },

  async getUser() {
    if (!getToken()) return { data: { user: null }, error: null };

    try {
      const result = await request("/api/auth/me");
      return { data: { user: result.user }, error: null };
    } catch (error) {
      if (error.status === 401) {
        setToken("");
        return { data: { user: null }, error: null };
      }
      return { data: { user: null }, error };
    }
  },

  async getSession() {
    const { data, error } = await this.getUser();
    return {
      data: {
        session: data.user
          ? { user: data.user, access_token: getToken() }
          : null,
      },
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
