import { beforeEach, describe, expect, it, vi } from "vitest";

const writeDb = vi.fn();

vi.mock("./db.js", () => ({
  writeDb,
}));

const { executeQuery } = await import("./query.js");

function createDb() {
  return {
    users: [],
    sessions: [],
    profiles: [
      {
        id: "owner-1",
        display_name: "Owner One",
        email: "owner@example.com",
      },
      {
        id: "rescuer-1",
        display_name: "Rescuer One",
        email: "rescuer@example.com",
      },
    ],
    pets: [
      {
        id: "lost-1",
        owner_id: "owner-1",
        name: "Miu",
        category: "lost",
        status: "available",
        district: "District 1",
        lat: 10.77,
        lng: 106.70,
        created_at: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "rescue-1",
        owner_id: "owner-1",
        name: "Mun",
        category: "rescue",
        status: "available",
        rescuer_id: null,
        district: "Thu Duc",
        lat: 10.85,
        lng: 106.75,
        created_at: "2026-10-02T10:00:00.000Z",
      },
    ],
    rescue_appeals: [],
    rescue_updates: [],
  };
}

const owner = {
  id: "owner-1",
  email: "owner@example.com",
  user_metadata: {},
};

const rescuer = {
  id: "rescuer-1",
  email: "rescuer@example.com",
  user_metadata: {},
};

describe("business query flows", () => {
  beforeEach(() => {
    writeDb.mockClear();
  });

  it("creates a post and always assigns the authenticated owner", () => {
    const db = createDb();

    const created = executeQuery(
      {
        table: "pets",
        action: "insert",
        payload: {
          id: "new-1",
          owner_id: "someone-else",
          name: "Bé Cam",
          category: "adopt",
        },
        single: "single",
      },
      owner,
      db,
    );

    expect(created.id).toBe("new-1");
    expect(created.owner_id).toBe(owner.id);
    expect(created.status).toBe("available");
    expect(db.pets).toContainEqual(created);
    expect(writeDb).toHaveBeenCalledOnce();
  });

  it("filters visible posts by category, status and map bounds", () => {
    const db = createDb();

    const rows = executeQuery(
      {
        table: "pets",
        action: "select",
        filters: [
          { op: "eq", column: "category", value: "rescue" },
          { op: "eq", column: "status", value: "available" },
          { op: "gte", column: "lat", value: 10.80 },
          { op: "lte", column: "lat", value: 10.90 },
          { op: "gte", column: "lng", value: 106.70 },
          { op: "lte", column: "lng", value: 106.80 },
        ],
      },
      null,
      db,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("rescue-1");
  });

  it("opens a detail row with profile decoration", () => {
    const db = createDb();

    const row = executeQuery(
      {
        table: "pets",
        action: "select",
        columns: "*, profiles(name, avatar_url)",
        filters: [{ op: "eq", column: "id", value: "lost-1" }],
        single: "single",
      },
      null,
      db,
    );

    expect(row.id).toBe("lost-1");
    expect(row.profiles.name).toBe("Owner One");
  });

  it("lets the owner close their own case", () => {
    const db = createDb();

    const updated = executeQuery(
      {
        table: "pets",
        action: "update",
        filters: [{ op: "eq", column: "id", value: "lost-1" }],
        payload: { status: "closed" },
        single: "single",
      },
      owner,
      db,
    );

    expect(updated.status).toBe("closed");
    expect(db.pets.find((pet) => pet.id === "lost-1").status).toBe("closed");
    expect(writeDb).toHaveBeenCalledOnce();
  });

  it("blocks a non-owner from editing or deleting another user's case", () => {
    const db = createDb();

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "update",
          filters: [{ op: "eq", column: "id", value: "lost-1" }],
          payload: { status: "closed" },
        },
        rescuer,
        db,
      ),
    ).toThrow("Không có quyền cập nhật.");

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "delete",
          filters: [{ op: "eq", column: "id", value: "lost-1" }],
        },
        rescuer,
        db,
      ),
    ).toThrow("Không có quyền xóa.");
  });

  it("lets a rescuer claim an unassigned rescue case", () => {
    const db = createDb();

    const updated = executeQuery(
      {
        table: "pets",
        action: "update",
        filters: [{ op: "eq", column: "id", value: "rescue-1" }],
        payload: { rescuer_id: rescuer.id },
        single: "single",
      },
      rescuer,
      db,
    );

    expect(updated.rescuer_id).toBe(rescuer.id);
    expect(writeDb).toHaveBeenCalledOnce();
  });

  it("prevents a second rescuer from taking an already claimed case", () => {
    const db = createDb();
    db.pets.find((pet) => pet.id === "rescue-1").rescuer_id = "rescuer-2";

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "update",
          filters: [{ op: "eq", column: "id", value: "rescue-1" }],
          payload: { rescuer_id: rescuer.id },
        },
        rescuer,
        db,
      ),
    ).toThrow("Không có quyền cập nhật.");
  });

  it("lets only the owner delete a case", () => {
    const db = createDb();

    const deleted = executeQuery(
      {
        table: "pets",
        action: "delete",
        filters: [{ op: "eq", column: "id", value: "lost-1" }],
      },
      owner,
      db,
    );

    expect(deleted.map((pet) => pet.id)).toEqual(["lost-1"]);
    expect(db.pets.some((pet) => pet.id === "lost-1")).toBe(false);
    expect(writeDb).toHaveBeenCalledOnce();
  });

  it("requires filters for update and delete mutations", () => {
    const db = createDb();

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "update",
          payload: { status: "closed" },
        },
        owner,
        db,
      ),
    ).toThrow("Mutation requires filters");

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "delete",
        },
        owner,
        db,
      ),
    ).toThrow("Mutation requires filters");
  });
});
