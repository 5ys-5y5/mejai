import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const target = process.argv[2];

if (!target) {
  console.error("[run-if-exists] Missing script path argument.");
  process.exit(1);
}

const scriptPath = resolve(process.cwd(), target);

if (!existsSync(scriptPath)) {
  console.warn(`[run-if-exists] Skipping missing script: ${target}`);
  process.exit(0);
}

const child = spawn(process.execPath, [scriptPath, ...process.argv.slice(3)], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
