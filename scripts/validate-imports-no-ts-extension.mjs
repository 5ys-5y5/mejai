import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const IMPORT_RE = /(import|export)\s+[^;]*?from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(fullPath, files);
      continue;
    }
    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const violations = [];
const files = walk(ROOT);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, "utf8");
  let match;
  while ((match = IMPORT_RE.exec(content)) !== null) {
    const specifier = match[2] || match[3] || "";
    if (!specifier) continue;
    if (specifier.endsWith(".ts") || specifier.endsWith(".tsx")) {
      const line = content.slice(0, match.index).split("\n").length;
      violations.push({ filePath, line, specifier });
    }
  }
}

if (violations.length > 0) {
  console.error("Import paths must not include .ts/.tsx extensions.");
  for (const v of violations) {
    console.error(`- ${path.relative(process.cwd(), v.filePath)}:${v.line} -> ${v.specifier}`);
  }
  process.exit(1);
}

console.log("OK: no .ts/.tsx extensions in import paths.");
