import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_ROOT = path.join(ROOT, "src", "app", "api", "runtime");
const ALLOWLIST = new Set([
  "src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts",
]);
const BANNED = ["맞으면 '네', 아니면 '아니오'를 입력해 주세요."];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && p.endsWith(".ts")) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(TARGET_ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;
  const code = fs.readFileSync(file, "utf8");
  const lines = code.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const banned of BANNED) {
      if (line.includes(banned)) {
        violations.push({
          file: rel,
          line: idx + 1,
          msg: `hardcoded prompt literal detected: ${banned}`,
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error("[validate-runtime-prompt-templates] violations found:");
  violations.forEach((v) => console.error(`- ${v.file}:${v.line} ${v.msg}`));
  process.exit(1);
}

console.log("[validate-runtime-prompt-templates] ok");

