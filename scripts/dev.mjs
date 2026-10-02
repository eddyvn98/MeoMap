import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["server/index.js"], { stdio: "inherit", env: process.env }),
  spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["vite", "--host", "0.0.0.0"], {
    stdio: "inherit",
    env: process.env,
  }),
];

let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 200);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!closing && code && code !== 0) shutdown(code);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
