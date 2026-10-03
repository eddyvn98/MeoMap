import { describe, expect, it } from "vitest";
import { validateImageUpload } from "./security.js";

describe("upload validation", () => {
  it("accepts a PNG signature", () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]).toString("base64");

    const result = validateImageUpload("photo.png", pngHeader);
    expect(result.extension).toBe(".png");
    expect(result.contentType).toBe("image/png");
  });

  it("rejects active-content extensions", () => {
    const content = Buffer.from("<svg></svg>").toString("base64");

    expect(() => validateImageUpload("photo.svg", content)).toThrow(
      "Chỉ hỗ trợ ảnh",
    );
  });

  it("rejects content that does not match its extension", () => {
    const fake = Buffer.from("not really a png").toString("base64");

    expect(() => validateImageUpload("photo.png", fake)).toThrow(
      "Nội dung file không khớp",
    );
  });
});
