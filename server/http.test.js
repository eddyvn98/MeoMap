import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./http.js";

function request(origin, host = "meomap.example") {
  return {
    headers: {
      host,
      ...(origin ? { origin } : {}),
    },
  };
}

describe("origin policy", () => {
  it("allows requests without an Origin header", () => {
    expect(isAllowedOrigin(request(null))).toBe(true);
  });

  it("allows a same-host browser origin", () => {
    expect(
      isAllowedOrigin(request("https://meomap.example")),
    ).toBe(true);
  });

  it("rejects an unrelated browser origin by default", () => {
    expect(
      isAllowedOrigin(request("https://attacker.example")),
    ).toBe(false);
  });
});
