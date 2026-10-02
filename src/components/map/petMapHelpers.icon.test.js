import { beforeEach, describe, expect, it, vi } from "vitest";

const divIcon = vi.fn((options) => options);

vi.mock("leaflet", () => ({
  default: { divIcon },
}));

const { makeStatusIcon } = await import("./petMapHelpers");

describe("pet marker status icon", () => {
  beforeEach(() => {
    divIcon.mockClear();
  });

  it("renders an active lost case in red", () => {
    const icon = makeStatusIcon("available", "lost", "cat.jpg");

    expect(icon.html).toContain("Lost");
    expect(icon.html).toContain("#ef4444");
    expect(icon.html).toContain('src="cat.jpg"');
  });

  it("renders a delivered lost case as found", () => {
    const icon = makeStatusIcon("delivered", "lost");

    expect(icon.html).toContain("✓ Found");
    expect(icon.html).toContain("#10b981");
  });

  it("renders rescue cases with rescue status", () => {
    const icon = makeStatusIcon("available", "rescue");

    expect(icon.html).toContain("Rescue");
    expect(icon.html).toContain("#f59e0b");
  });

  it("shows the owner badge only for the owner", () => {
    const owned = makeStatusIcon(
      "available",
      "adopt",
      null,
      { owner_id: "user-1" },
      "user-1",
    );
    const other = makeStatusIcon(
      "available",
      "adopt",
      null,
      { owner_id: "user-1" },
      "user-2",
    );

    expect(owned.html).toContain("OWNER");
    expect(other.html).not.toContain("OWNER");
  });

  it("uses a safe fallback image when no image is supplied", () => {
    const icon = makeStatusIcon("available", "adopt");

    expect(icon.html).toContain("2127645.png");
    expect(divIcon).toHaveBeenCalledTimes(1);
  });
});
