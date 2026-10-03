import http from "node:http";
import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  DIST_DIR,
  PORT,
  REQUEST_TIMEOUT_MS,
  UPLOAD_DIR,
} from "./config.js";
import { handleApi } from "./api.js";
import {
  applyResponseHeaders,
  isAllowedOrigin,
  json,
  safeUploadPath,
  serveFile,
  writeCorsPreflight,
} from "./http.js";

let apiQueue = Promise.resolve();

function isWithin(root, target) {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function enqueueApi(task) {
  const next = apiQueue.then(task, task);
  apiQueue = next.catch(() => {});
  return next;
}

const server = http.createServer(async (req, res) => {
  applyResponseHeaders(req, res);

  if (req.method === "OPTIONS") {
    return writeCorsPreflight(req, res);
  }

  if (!isAllowedOrigin(req)) {
    return json(res, 403, { error: "Origin không được phép." });
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "GET") {
        return await handleApi(req, res, url);
      }
      return await enqueueApi(() => handleApi(req, res, url));
    }

    if (url.pathname.startsWith("/uploads/")) {
      const relative = safeUploadPath(
        decodeURIComponent(url.pathname.slice("/uploads/".length)),
      );
      const full = resolve(UPLOAD_DIR, relative);
      if (!isWithin(UPLOAD_DIR, full)) {
        return json(res, 403, { error: "Forbidden" });
      }
      if (serveFile(res, full)) return;
      return json(res, 404, { error: "File not found" });
    }

    if (existsSync(DIST_DIR)) {
      const requested =
        url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
      const candidate = resolve(DIST_DIR, requested);

      if (isWithin(DIST_DIR, candidate) && serveFile(res, candidate)) {
        return;
      }
      if (serveFile(res, join(DIST_DIR, "index.html"))) return;
    }

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("MeoMap local API is running. Run npm run dev for the web UI.");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      const status = Number(error.status) || 500;
      json(res, status, {
        error: status < 500 ? error.message : "Internal server error",
      });
    } else {
      res.end();
    }
  }
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.min(REQUEST_TIMEOUT_MS, 20000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MeoMap local server: http://localhost:${PORT}`);
});
