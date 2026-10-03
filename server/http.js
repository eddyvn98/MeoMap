import { createReadStream, existsSync, statSync } from "node:fs";
import { extname } from "node:path";
import { CORS_ORIGINS } from "./config.js";

function sameHostOrigin(req, origin) {
  try {
    return new URL(origin).host === String(req.headers.host || "");
  } catch {
    return false;
  }
}

export function isAllowedOrigin(req) {
  const origin = String(req.headers.origin || "");
  if (!origin) return true;
  return sameHostOrigin(req, origin) || CORS_ORIGINS.includes(origin);
}

export function applyResponseHeaders(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self)");

  const origin = String(req.headers.origin || "");
  if (origin && isAllowedOrigin(req)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
}

export function writeCorsPreflight(req, res) {
  if (!isAllowedOrigin(req)) {
    return json(res, 403, { error: "Origin không được phép." });
  }

  res.writeHead(204, {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Max-Age": "600",
  });
  return res.end();
}

export function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

export function readBody(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolveBody, reject) => {
    let total = 0;
    const chunks = [];
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.on("data", (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        fail(Object.assign(new Error("Request too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      if (!chunks.length) return resolveBody({});
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", fail);
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
