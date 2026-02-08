import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

function execFileAsync(file: string, args: string[], cwd: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

export async function applyApprovedPatch(input: { repositoryRoot: string; unifiedDiff: string | null }) {
  if (!input.unifiedDiff || !input.unifiedDiff.trim()) {
    return { applied: false as const, reason: "NO_DIFF" };
  }
  const tmpPath = path.join(os.tmpdir(), `runtime_patch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.diff`);
  await fs.writeFile(tmpPath, input.unifiedDiff, "utf8");
  try {
    await execFileAsync("git", ["apply", "--index", "--whitespace=nowarn", tmpPath], input.repositoryRoot);
    return { applied: true as const };
  } catch (error) {
    return {
      applied: false as const,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}
