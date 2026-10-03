import { describe, expect, it } from "vitest";
import {
  authUser,
  createSession,
  hashSessionToken,
  revokeSession,
} from "./auth.js";

function createDb() {
  return {
    users: [
      {
        id: "user-1",
        email: "user@example.com",
        user_metadata: {},
      },
    ],
    sessions: [],
  };
}

describe("session security", () => {
  it("stores only a hash for new session tokens", () => {
    const db = createDb();
    const token = createSession(db, "user-1");

    expect(token).toHaveLength(64);
    expect(db.sessions).toHaveLength(1);
    expect(db.sessions[0].token).toBeUndefined();
    expect(db.sessions[0].token_hash).toBe(hashSessionToken(token));

    const user = authUser(
      { headers: { authorization: `Bearer ${token}` } },
      db,
    );
    expect(user?.id).toBe("user-1");
  });

  it("revokes hashed sessions using the raw bearer token", () => {
    const db = createDb();
    const token = createSession(db, "user-1");

    revokeSession(db, token);
    expect(db.sessions).toHaveLength(0);
  });

  it("keeps legacy plaintext sessions valid during migration", () => {
    const db = createDb();
    db.sessions.push({
      token: "legacy-token",
      user_id: "user-1",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    const user = authUser(
      { headers: { authorization: "Bearer legacy-token" } },
      db,
    );
    expect(user?.id).toBe("user-1");
  });
});
