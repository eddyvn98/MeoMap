import { describe, expect, it, vi } from "vitest";

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn((options) => options),
  },
}));

const {
  DEFAULT_CENTER,
  getDistanceKm,
  tooltipTextByCategory,
} = await import("./petMapHelpers");

describe("pet map helpers", () => {
  it("uses the expected default center", () => {
    expect(DEFAULT_CENTER).toEqual({ lat: 10.8019, lng: 106.7147 });
  });

  it("returns null when a coordinate is missing", () => {
    expect(getDistanceKm(null, DEFAULT_CENTER)).toBeNull();
    expect(getDistanceKm(DEFAULT_CENTER, null)).toBeNull();
  });

  it("returns zero for the same coordinate", () => {
    expect(getDistanceKm(DEFAULT_CENTER, DEFAULT_CENTER)).toBeCloseTo(0, 8);
  });

  it("calculates a plausible distance inside Ho Chi Minh City", () => {
    const district1 = { lat: 10.7758, lng: 106.7004 };
    const thuDuc = { lat: 10.8494, lng: 106.7537 };
    const distance = getDistanceKm(district1, thuDuc);

    expect(distance).toBeGreaterThan(9);
    expect(distance).toBeLessThan(12);
  });

  it.each([
    ["adopt", "Nhận nuôi"],
    ["lost", "Đi lạc"],
    ["rescue", "Cứu hộ"],
    ["other", "Bài đăng thú cưng"],
  ])("returns useful tooltip text for %s", (category, expectedText) => {
    expect(tooltipTextByCategory(category)).toContain(expectedText);
  });
});
