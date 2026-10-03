import { extname } from "node:path";

const buckets = new Map();
const IMAGE_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

export function clientKey(req) {
  const forwarded = String(req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "");
  const ip = forwarded.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  return ip.slice(0, 128);
}

export function consumeRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function hasImageSignature(buffer, ext) {
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (ext === ".png") {
    return buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e &&
      buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a &&
      buffer[6] === 0x1a && buffer[7] === 0x0a;
  }
  if (ext === ".gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (ext === ".webp") {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

export function validateImageUpload(path, base64Data, maxBytes = 8 * 1024 * 1024) {
  const ext = extname(path).toLowerCase();
  const expectedType = IMAGE_TYPES.get(ext);
  if (!expectedType) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.");
  }

  const data = String(base64Data || "");
  if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw new Error("Dữ liệu ảnh không hợp lệ.");
  }

  const buffer = Buffer.from(data, "base64");
  if (!buffer.length) throw new Error("Ảnh rỗng.");
  if (buffer.length > maxBytes) throw new Error("Ảnh vượt quá 8 MB.");
  if (!hasImageSignature(buffer, ext)) {
    throw new Error("Nội dung file không khớp định dạng ảnh.");
  }

  return { buffer, contentType: expectedType };
}
