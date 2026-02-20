import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET = path.join(
  ROOT,
  "src",
  "app",
  "api",
  "runtime",
  "chat",
  "presentation",
  "ui-runtimeResponseRuntime.ts"
);

const code = fs.readFileSync(TARGET, "utf8");
const checks = [
  { label: "response_schema_field", pattern: /response_schema\s*:/ },
  { label: "schema_builder_usage", pattern: /buildRuntimeResponseSchema\s*\(/ },
  { label: "schema_validator_usage", pattern: /validateRuntimeResponseSchema\s*\(/ },
];

const missing = checks.filter((item) => !item.pattern.test(code)).map((item) => item.label);
if (missing.length > 0) {
  console.error(`[validate-runtime-response-schema] missing checks: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("[validate-runtime-response-schema] ok");

