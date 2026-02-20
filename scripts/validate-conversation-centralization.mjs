import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");

const CENTRAL_UI_FILE = "src/components/design-system/conversation/ConversationUI.parts.tsx";
const DESIGN_SYSTEM_INDEX = "src/components/design-system/index.ts";
const DESIGN_SYSTEM_PAGE = "src/app/app/design-system/page.tsx";
const CENTRAL_DEFINITION_GROUPS = [
  {
    label: "conversation-ui",
    file: "src/components/design-system/conversation/ConversationUI.parts.tsx",
    names: [
      "ConversationAdminMenu",
      "ConversationThread",
      "ConversationSetupPanel",
      "ConversationSetupBox",
      "ConversationSplitLayout",
      "ConversationGrid",
      "ConversationQuickReplyButton",
      "ConversationConfirmButton",
      "ConversationProductCard",
      "ConversationSessionHeader",
      "ConversationWorkbenchTopBar",
      "ConversationSetupFields",
      "ConversationExistingSetup",
      "ConversationNewModelControls",
      "ConversationReplySelectors",
      "ConversationModelSetupColumnLego",
      "ConversationModelChatColumnLego",
      "ConversationModelComposedLego",
      "createConversationModelLegos",
    ],
  },
  {
    label: "widget-ui",
    file: "src/components/design-system/widget/WidgetUI.parts.tsx",
    names: [
      "WidgetLauncherContainer",
      "WidgetLauncherButton",
      "WidgetLauncherIcon",
      "WidgetLauncherLabel",
      "WidgetLauncherIframe",
      "WidgetShell",
      "WidgetConversationLayout",
      "WidgetHeaderLego",
      "WidgetTabBarLego",
      "WidgetHistoryPanelLego",
    ],
  },
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
      files.push(...walk(full));
      continue;
    }
    files.push(full);
  }
  return files;
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

function assertCentralComponentDefinitions() {
  const definitionFiles = walk(srcRoot).filter((file) => /\.(mjs|cjs|js|jsx|ts|tsx)$/.test(file));
  const centralFiles = new Set(
    CENTRAL_DEFINITION_GROUPS.map((group) => path.join(root, group.file))
  );
  const offenders = [];

  for (const group of CENTRAL_DEFINITION_GROUPS) {
    const centralPath = path.join(root, group.file);
    const centralText = read(group.file);
    for (const name of group.names) {
      const defRe = new RegExp(`\\b(?:export\\s+)?function\\s+${name}\\b|\\b(?:export\\s+)?const\\s+${name}\\b`);
      if (!defRe.test(centralText)) {
        throw new Error(`[FAIL] Central UI definition missing: ${name} :: ${group.file}`);
      }
      for (const file of definitionFiles) {
        if (centralFiles.has(file)) continue;
        const text = fs.readFileSync(file, "utf8");
        if (defRe.test(text)) {
          offenders.push(`${name} -> ${path.relative(root, file)}`);
        }
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(`[FAIL] Central UI rule broken. Duplicate definitions found:\n- ${offenders.join("\n- ")}`);
  }
  console.log("[PASS] Central UI definitions exist only in design-system parts files");
}

function extractUiDefinitionItems(text) {
  const blockMatch = text.match(/const uiDefinitionItems:[\s\S]*?=\s*\[([\s\S]*?)\];/m);
  if (!blockMatch) return [];
  const block = blockMatch[1] || "";
  const items = [];
  const itemRe =
    /{[^}]*name:\s*"([^"]+)"[^}]*definedAt:\s*(?:"([^"]+)"|`([^`]+)`)[^}]*}/g;
  let match = itemRe.exec(block);
  while (match) {
    items.push({ name: match[1], definedAt: match[2] || match[3] || "" });
    match = itemRe.exec(block);
  }
  return items;
}

function assertDesignSystemRegistryExports() {
  const pageText = read(DESIGN_SYSTEM_PAGE);
  const indexText = read(DESIGN_SYSTEM_INDEX);
  const items = extractUiDefinitionItems(pageText);
  const missing = [];
  const skipExternal = new Set(["LucideIcon"]);

  for (const item of items) {
    if (!item.name) continue;
    if (skipExternal.has(item.name)) continue;
    const definedAt = String(item.definedAt || "");
    if (!definedAt.startsWith("src/")) continue;
    const exportRe = new RegExp(`\\b${item.name}\\b`);
    if (!exportRe.test(indexText)) {
      missing.push(`${item.name} (${definedAt})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[FAIL] Design-system registry items must be exported via ${DESIGN_SYSTEM_INDEX}:\n- ${missing.join("\n- ")}`
    );
  }
  console.log("[PASS] design-system registry items are exported via design-system index");
}

try {
  assertMatch(
    "src/components/landing/conversation-hero.tsx",
    /from\s+"@\/components\/design-system"/,
    "landing hero uses design-system exports"
  );

  assertMatch(
    "src/app/app/laboratory/page.tsx",
    /from\s+"@\/components\/design-system"/,
    "laboratory page uses design-system exports"
  );

  assertNotMatch(
    "src/app/app/laboratory/page.tsx",
    /from\s+"@\/components\/design-system\/conversation\/ConversationUI\.parts"/,
    "laboratory page avoids direct ConversationUI.parts import"
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
    "src/app/embed/[key]/page.tsx",
    /resolveConversationPageFeatures\(WIDGET_PAGE_KEY,/,
    "widget page resolves policy with WIDGET_PAGE_KEY"
  );

  assertMatch(
    "src/app/embed/[key]/page.tsx",
    /resolveConversationSetupUi\(WIDGET_PAGE_KEY,/,
    "widget page resolves setup UI with WIDGET_PAGE_KEY"
  );

  assertMatch(
    "src/app/api/widget/chat/route.ts",
    /page_key:\s*WIDGET_PAGE_KEY/,
    "widget chat runtime request includes page_key"
  );

  assertMatch(
    "src/app/api/widget/chat/route.ts",
    /resolveConversationPageFeatures\(WIDGET_PAGE_KEY/,
    "widget chat applies page_key policy"
  );

  assertMatch(
    "src/app/api/widget/stream/route.ts",
    /page_key:\s*WIDGET_PAGE_KEY/,
    "widget stream runtime request includes page_key"
  );

  assertMatch(
    "src/app/api/widget/stream/route.ts",
    /resolveConversationPageFeatures\(WIDGET_PAGE_KEY/,
    "widget stream applies page_key policy"
  );

  assertNotMatch(
    "src/app/app/design-system/page.tsx",
    /from\s+"@\/components\/(?!design-system)/,
    "design-system page only imports components via design-system"
  );

  assertMatch(
    CENTRAL_UI_FILE,
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

  assertCentralComponentDefinitions();
  assertDesignSystemRegistryExports();

  console.log("\nConversation centralization verification passed.");
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
