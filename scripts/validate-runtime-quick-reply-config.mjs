import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const TARGET_ROOT = path.join(ROOT, "src", "app", "api", "runtime");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && p.endsWith(".ts")) out.push(p);
  }
  return out;
}

function getPropName(name) {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  return null;
}

function hasObjectProp(obj, key) {
  return obj.properties.some((prop) => {
    if (!ts.isPropertyAssignment(prop)) return false;
    const name = getPropName(prop.name);
    return name === key;
  });
}

function getLiteralLikeText(expr) {
  if (!expr) return "";
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isTemplateExpression(expr)) return expr.head.text + expr.templateSpans.map((span) => span.literal.text).join("");
  return "";
}

function findViolations(filePath) {
  const code = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const issues = [];

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "respond") {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const hasQuickReplies = hasObjectProp(arg, "quick_replies");
        const hasQuickReplyConfig = hasObjectProp(arg, "quick_reply_config");
        if (hasQuickReplies && !hasQuickReplyConfig) {
          const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          issues.push({
            line: line + 1,
            col: character + 1,
            msg: "respond(...) has quick_replies but missing quick_reply_config",
          });
        }
        const messageProp = arg.properties.find((prop) => {
          if (!ts.isPropertyAssignment(prop)) return false;
          return getPropName(prop.name) === "message";
        });
        if (messageProp && ts.isPropertyAssignment(messageProp) && !hasQuickReplyConfig) {
          const messageText = getLiteralLikeText(messageProp.initializer);
          if (/맞으면\s*'네'[\s\S]*'아니오'/.test(messageText)) {
            const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
            issues.push({
              line: line + 1,
              col: character + 1,
              msg: "respond(...) yes/no prompt detected in message but missing quick_reply_config",
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return issues;
}

const files = walk(TARGET_ROOT);
const violations = [];
for (const file of files) {
  const issues = findViolations(file);
  for (const issue of issues) {
    violations.push({
      file: path.relative(ROOT, file).replace(/\\/g, "/"),
      ...issue,
    });
  }
}

if (violations.length > 0) {
  console.error("[validate-runtime-quick-reply-config] violations found:");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line}:${v.col} ${v.msg}`);
  }
  process.exit(1);
}

console.log("[validate-runtime-quick-reply-config] ok");
