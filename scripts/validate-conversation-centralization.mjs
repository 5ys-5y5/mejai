import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertMatch(rel, re, label) {
  const text = read(rel);
  if (!re.test(text)) {
    throw new Error(`[FAIL] ${label} :: ${rel}`);
  }
  console.log(`[PASS] ${label}`);
}

function assertNotMatch(rel, re, label) {
  const text = read(rel);
  if (re.test(text)) {
    throw new Error(`[FAIL] ${label} :: ${rel}`);
  }
  console.log(`[PASS] ${label}`);
}

try {
  assertMatch(
    "src/app/page.tsx",
    /from\s+"@\/components\/design-system\/conversation\/ConversationUI"[\s\S]*HeroConversationSurface/m,
    "home page uses ConversationUI surface"
  );

  assertMatch(
    "src/app/app/laboratory/page.tsx",
    /from\s+"@\/components\/design-system\/conversation\/ConversationUI"[\s\S]*ConversationSurface/m,
    "laboratory page uses ConversationUI surface"
  );

  assertMatch(
    "src/lib/conversation/client/useHeroPageController.ts",
    /page_key:\s*"\/"/,
    "hero request includes page_key"
  );

  assertMatch(
    "src/lib/conversation/client/laboratoryTransport.ts",
    /page_key:\s*pageKey/,
    "laboratory request includes page_key"
  );

  assertMatch(
    "src/app/api/laboratory/run/route.ts",
    /parsePageKey\(body\.page_key\)[\s\S]*resolveConversationPageFeatures\(pageKey,\s*providerValue\)/m,
    "server resolves page policy by page_key"
  );

  assertMatch(
    "src/components/design-system/conversation/ConversationUI.tsx",
    /const renderPlan = message\.renderPlan;\s*\n\s*if \(!renderPlan\) return null;/m,
    "reply selector requires renderPlan"
  );

  assertNotMatch(
    "src/lib/runtimeResponseTranscript.ts",
    /quickReplyConfig/,
    "runtime response mapper no longer emits quickReplyConfig"
  );

  assertNotMatch(
    "src/lib/debugTranscript.ts",
    /quickReplyConfig/,
    "debug transcript no longer depends on quickReplyConfig"
  );

  console.log("\nConversation centralization verification passed.");
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
