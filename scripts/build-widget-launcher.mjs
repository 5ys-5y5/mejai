import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const banner = "/* AUTO-GENERATED. EDIT WidgetUI.parts.tsx */";

await build({
  absWorkingDir: projectRoot,
  bundle: true,
  minify: true,
  platform: "browser",
  target: ["es2018"],
  format: "iife",
  sourcemap: false,
  outfile: path.join(projectRoot, "public", "widget.js"),
  banner: { js: banner },
  define: {
    "process.env.NODE_ENV": "\"production\"",
  },
  stdin: {
    contents: `
      import { mountWidgetLauncher } from "./src/components/design-system/widget/WidgetUI.parts";
      mountWidgetLauncher();
    `,
    resolveDir: projectRoot,
    loader: "tsx",
  },
});
