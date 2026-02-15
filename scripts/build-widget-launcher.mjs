import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outFile = path.join(root, "public/widget.js");
const tsconfig = path.join(root, "tsconfig.json");

const entryContents = `
import { mountWidgetLauncher } from "./src/components/design-system/widget/WidgetUI.parts";
mountWidgetLauncher();
`;

try {
  await build({
    stdin: {
      contents: entryContents,
      resolveDir: root,
      loader: "tsx",
    },
    absWorkingDir: root,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2017"],
    minify: true,
    outfile: outFile,
    sourcemap: false,
    tsconfig,
    define: {
      "process.env.NODE_ENV": "\"production\"",
    },
    banner: {
      js: "/* AUTO-GENERATED. EDIT WidgetUI.parts.tsx */",
    },
  });
  console.log("[widget launcher] public/widget.js updated.");
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
