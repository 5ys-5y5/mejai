import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { MANAGED_ENV_KEYS, type ManagedEnvKey } from "@/lib/managedEnvKeys";
import { decryptManagedEnv } from "@/lib/managedEnvCrypto";

type ManagedEnvValues = Partial<Record<ManagedEnvKey, string>>;
type ManagedEnvBundle = {
  deploy: ManagedEnvValues;
  local: ManagedEnvValues;
};

type CacheEntry = {
  expiresAt: number;
  values: ManagedEnvBundle;
  updatedAt: string | null;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function normalizeManagedEnvInput(values: Record<string, unknown> | null | undefined): ManagedEnvValues {
  const next: ManagedEnvValues = {};
  if (!values || typeof values !== "object") return next;
  MANAGED_ENV_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      next[key] = normalizeValue((values as Record<string, unknown>)[key]);
    }
  });
  return next;
}

function normalizeManagedBundle(input: Record<string, unknown>) {
  const deploy = normalizeManagedEnvInput((input.deploy as Record<string, unknown>) || input);
  const local = normalizeManagedEnvInput((input.local as Record<string, unknown>) || {});
  return { deploy, local } satisfies ManagedEnvBundle;
}

function extractManagedEnvFromProviders(
  providers: Record<string, Record<string, unknown> | undefined> | null
): ManagedEnvBundle {
  const encrypted = (providers?.runtime_env || {}) as Record<string, unknown>;
  let raw: Record<string, unknown> = {};
  try {
    raw = decryptManagedEnv(encrypted);
  } catch {
    raw = {};
  }
  return normalizeManagedBundle(raw);
}

export async function loadManagedEnvForOrg(orgId: string, options?: { force?: boolean }) {
  const cached = cache.get(orgId);
  const now = Date.now();
  if (!options?.force && cached && cached.expiresAt > now) {
    return cached.values;
  }

  let supabase;
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    return cached?.values || {};
  }

  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("id, providers, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return cached?.values || {};
  }

  const rows = data as Array<{
    providers?: Record<string, Record<string, unknown>> | null;
    updated_at?: string | null;
    user_id?: string | null;
  }>;
  const withEnv = rows.filter((row) => row.providers?.runtime_env);
  const picked = withEnv.find((row) => !row.user_id) || withEnv[0];
  const values = extractManagedEnvFromProviders(picked?.providers || null);
  cache.set(orgId, {
    values,
    updatedAt: picked?.updated_at || null,
    expiresAt: now + CACHE_TTL_MS,
  });
  return values;
}

export async function applyManagedEnvOverrides(orgId: string) {
  const bundle = await loadManagedEnvForOrg(orgId);
  const mode = process.env.NODE_ENV === "development" ? "local" : "deploy";
  const picked = mode === "local" ? bundle.local : bundle.deploy;
  const fallback = mode === "local" ? bundle.deploy : bundle.local;
  for (const key of MANAGED_ENV_KEYS) {
    if (picked[key] !== undefined && picked[key] !== "") {
      process.env[key] = picked[key] ?? "";
      continue;
    }
    if (fallback[key] !== undefined && fallback[key] !== "") {
      process.env[key] = fallback[key] ?? "";
    }
  }
  return bundle;
}
