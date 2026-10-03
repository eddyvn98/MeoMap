import { describe, expect, it, vi } from "vitest";

vi.mock("./db.js", () => ({ writeDb: vi.fn() }));

const { executeQuery } = await import("./query.js");

const owner = {
  id: "owner-1",
  email: "owner@example.com",
  user_metadata: {},
};

function dbWithPet() {
  return {
    users: [],
    sessions: [],
    profiles: [
      {
        id: owner.id,
        email: owner.email,
        display_name: "Owner",
        role: "user",
      },
    ],
    pets: [
      {
        id: "pet-1",
        owner_id: owner.id,
        name: "Miu",
        category: "lost",
        status: "available",
        contact_type: "phone",
        contact_value: "0901234567",
        bank_account_number: "secret",
        created_at: "2026-10-01T00:00:00.000Z",
      },
    ],
    rescue_appeals: [
      { id: "appeal-1", case_id: "pet-1", rescuer_id: "rescuer-1" },
    ],
    rescue_updates: [
      { id: "update-1", case_id: "pet-1", rescuer_id: "rescuer-1" },
    ],
  };
}

describe("mutation hardening", () => {
  it("ignores system fields during pet insert", () => {
    const db = dbWithPet();
    const created = executeQuery(
      {
        table: "pets",
        action: "insert",
        payload: {
          id: "chosen-id",
          owner_id: "other",
          rescuer_id: "attacker",
          bank_account_number: "123",
          name: "Cam",
          category: "adopt",
        },
        single: "single",
      },
      owner,
      db,
    );

    expect(created.id).not.toBe("chosen-id");
    expect(created.owner_id).toBe(owner.id);
    expect(created.rescuer_id).toBeUndefined();
    expect(created.bank_account_number).toBeUndefined();
  });

  it("blocks owner changes to system ownership fields", () => {
    const db = dbWithPet();

    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "update",
          filters: [{ op: "eq", column: "id", value: "pet-1" }],
          payload: { owner_id: "other" },
        },
        owner,
        db,
      ),
    ).toThrow("Không được cập nhật trường owner_id.");
  });

  it("does not expose contact or bank data in bulk pet reads", () => {
    const db = dbWithPet();
    const [pet] = executeQuery(
      { table: "pets", action: "select" },
      null,
      db,
    );

    expect(pet.contact_value).toBeUndefined();
    expect(pet.bank_account_number).toBeUndefined();
  });

  it("returns sanitized contact on an exact detail read", () => {
    const db = dbWithPet();
    const pet = executeQuery(
      {
        table: "pets",
        action: "select",
        filters: [{ op: "eq", column: "id", value: "pet-1" }],
        single: "single",
      },
      null,
      db,
    );

    expect(pet.contact_type).toBe("phone");
    expect(pet.contact_value).toBe("0901234567");
    expect(pet.bank_account_number).toBe("secret");
  });

  it("prevents profile role and email escalation", () => {
    const db = dbWithPet();
    const profile = executeQuery(
      {
        table: "profiles",
        action: "update",
        filters: [{ op: "eq", column: "id", value: owner.id }],
        payload: {
          display_name: "Safe Name",
          role: "admin",
          email: "admin@example.com",
        },
        single: "single",
      },
      owner,
      db,
    );

    expect(profile.display_name).toBe("Safe Name");
    expect(profile.role).toBe("user");
    expect(profile.email).toBe(owner.email);
  });

  it("rejects unknown filter operators", () => {
    const db = dbWithPet();
    expect(() =>
      executeQuery(
        {
          table: "pets",
          action: "select",
          filters: [{ op: "contains_everything", column: "name", value: "M" }],
        },
        null,
        db,
      ),
    ).toThrow("Invalid filter operator");
  });

  it("cascades rescue records when an owner deletes a pet", () => {
    const db = dbWithPet();
    executeQuery(
      {
        table: "pets",
        action: "delete",
        filters: [{ op: "eq", column: "id", value: "pet-1" }],
      },
      owner,
      db,
    );

    expect(db.rescue_appeals).toHaveLength(0);
    expect(db.rescue_updates).toHaveLength(0);
  });
});
