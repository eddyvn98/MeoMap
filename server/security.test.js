import { describe, expect, it, vi } from "vitest";

vi.mock("./db.js", () => ({
  writeDb: vi.fn(),
}));

const { executeQuery } = await import("./query.js");

function createDb() {
  return {
    users: [],
    sessions: [],
    profiles: [
      { id: "owner-1", display_name: "Owner One", email: "owner@example.com" },
      { id: "other-1", display_name: "Other One", email: "other@example.com" },
    ],
    pets: [],
    rescue_appeals: [],
    rescue_updates: [],
  };
}

const owner = {
  id: "owner-1",
  email: "owner@example.com",
  user_metadata: {},
};

describe("security query rules", () => {
  it("blocks bulk profile enumeration", () => {
    const db = createDb();

    expect(() =>
      executeQuery({ table: "profiles", action: "select" }, null, db),
    ).toThrow("Profile query requires an id filter.");
  });

  it("hides email from public profile reads", () => {
    const db = createDb();

    const profile = executeQuery(
      {
        table: "profiles",
        action: "select",
        filters: [{ op: "eq", column: "id", value: "owner-1" }],
        single: "single",
      },
      null,
      db,
    );

    expect(profile.id).toBe("owner-1");
    expect(profile.email).toBeUndefined();
    expect(profile.phone).toBeUndefined();
  });

  it("rejects invalid pet coordinates", () => {
    const db = createDb();

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "insert",
          payload: {
            name: "Bad pin",
            category: "lost",
            status: "available",
            lat: 999,
            lng: 106.7,
          },
        },
        owner,
        db,
      ),
    ).toThrow("Tọa độ không hợp lệ.");
  });
});
