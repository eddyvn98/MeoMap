import { createReadStream, existsSync, statSync } from "node:fs";
import { extname } from "node:path";

export function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

export function readBody(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolveBody, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolveBody({});
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

export function safeUploadPath(input) {
  const parts = String(input || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"));

  if (!parts.length) throw new Error("Invalid upload path");
  return parts.join("/");
}

export function mimeType(path) {
  const ext = extname(path).toLowerCase();
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".css": "text/css",
    ".js": "text/javascript",
    ".html": "text/html",
    ".json": "application/json",
  }[ext] || "application/octet-stream";
}

export function serveFile(res, path) {
  if (!existsSync(path) || !statSync(path).isFile()) return false;
  res.writeHead(200, {
    "Content-Type": mimeType(path),
    "Cache-Control": "no-cache",
  });
  createReadStream(path).pipe(res);
  return true;
}
