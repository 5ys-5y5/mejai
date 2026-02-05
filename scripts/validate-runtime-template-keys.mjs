import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(ROOT, "src", "app", "api", "runtime", "chat", "runtime", "promptTemplateRuntime.ts");
const code = fs.readFileSync(FILE, "utf8");

function readObjectKeys(anchor) {
  const anchorIndex = code.indexOf(anchor);
  if (anchorIndex < 0) return null;
  const start = code.indexOf("{", anchorIndex);
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const body = code.slice(start + 1, end);
  return Array.from(body.matchAll(/^\s*([a-z0-9_]+)\s*:/gim)).map((m) => m[1]);
}

const defaults = readObjectKeys("const DEFAULT_TEMPLATES");
const mapped = readObjectKeys("const keysByPriority");

if (!defaults || !mapped) {
  console.error("[validate-runtime-template-keys] failed to parse promptTemplateRuntime.ts");
  process.exit(1);
}

const defaultsSet = new Set(defaults);
const mappedSet = new Set(mapped);
const missingInMap = defaults.filter((k) => !mappedSet.has(k));
const missingInDefaults = mapped.filter((k) => !defaultsSet.has(k));

if (missingInMap.length > 0 || missingInDefaults.length > 0) {
  console.error("[validate-runtime-template-keys] key mismatch");
  if (missingInMap.length > 0) console.error(`- missing in keysByPriority: ${missingInMap.join(", ")}`);
  if (missingInDefaults.length > 0) console.error(`- missing in DEFAULT_TEMPLATES: ${missingInDefaults.join(", ")}`);
  process.exit(1);
}

console.log("[validate-runtime-template-keys] ok");

