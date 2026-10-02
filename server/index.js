import http from "node:http";
import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { DIST_DIR, PORT, UPLOAD_DIR } from "./config.js";
import { handleApi } from "./api.js";
import { json, safeUploadPath, serveFile } from "./http.js";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    });
    return res.end();
  }

  try {
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url);
    }

    if (url.pathname.startsWith("/uploads/")) {
      const relative = safeUploadPath(
        decodeURIComponent(url.pathname.slice("/uploads/".length)),
      );
      const full = normalize(join(UPLOAD_DIR, relative));
      if (!full.startsWith(normalize(UPLOAD_DIR))) {
        return json(res, 403, { error: "Forbidden" });
      }
      if (serveFile(res, full)) return;
      return json(res, 404, { error: "File not found" });
    }

    if (existsSync(DIST_DIR)) {
      const requested =
        url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
      const candidate = normalize(join(DIST_DIR, requested));

      if (candidate.startsWith(normalize(DIST_DIR)) && serveFile(res, candidate)) {
        return;
      }
      if (serveFile(res, join(DIST_DIR, "index.html"))) return;
    }

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("MeoMap local API is running. Run npm run dev for the web UI.");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      json(res, 500, { error: error.message || "Internal server error" });
    } else {
      res.end();
    }
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MeoMap local server: http://localhost:${PORT}`);
});
