import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { encryptManagedEnv, decryptManagedEnv } from "@/lib/managedEnvCrypto";
import { MANAGED_ENV_KEYS } from "@/lib/managedEnvKeys";

function getProviderFromParams(req: NextRequest) {
  const url = new URL(req.url);
  return (url.searchParams.get("provider") || "").trim();
}

function shouldRevealRuntimeEnv(req: NextRequest) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("reveal") || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

type AuthSettingsRow = {
  id: string;
  user_id: string;
  providers: Record<string, Record<string, unknown> | undefined> | null;
  updated_at?: string | null;
};

async function findChatPolicyRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orgId: string,
  currentUserId: string
) {
  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("id, user_id, providers, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return { row: null as AuthSettingsRow | null, error };
  const rows = (data || []) as AuthSettingsRow[];
  const withChatPolicy = rows.find((row) => Boolean(row.providers?.chat_policy));
  if (withChatPolicy) return { row: withChatPolicy, error: null };
  const owned = rows.find((row) => row.user_id === currentUserId);
  if (owned) return { row: owned, error: null };
  return { row: null as AuthSettingsRow | null, error: null };
}

async function findProviderRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orgId: string,
  currentUserId: string,
  providerKey: string
) {
  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("id, user_id, providers, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return { row: null as AuthSettingsRow | null, error };
  const rows = (data || []) as AuthSettingsRow[];
  const withProvider = rows.find((row) => Boolean(row.providers?.[providerKey]));
  if (withProvider) return { row: withProvider, error: null };
  const owned = rows.find((row) => row.user_id === currentUserId);
  if (owned) return { row: owned, error: null };
  return { row: null as AuthSettingsRow | null, error: null };
}

async function findRuntimeEnvRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orgId: string
) {
  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("id, user_id, providers, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return { row: null as AuthSettingsRow | null, error };
  const rows = (data || []) as AuthSettingsRow[];
  const withEnv = rows.filter((row) => Boolean(row.providers?.runtime_env));
  const orgRow = withEnv.find((row) => !row.user_id);
  if (orgRow) return { row: orgRow, error: null };
  const latest = withEnv[0];
  if (latest) return { row: latest, error: null };
  return { row: null as AuthSettingsRow | null, error: null };
}

export async function GET(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const provider = getProviderFromParams(req);
  if (!provider) {
    return NextResponse.json({ error: "PROVIDER_REQUIRED" }, { status: 400 });
  }
  const revealRuntimeEnv = provider === "runtime_env" ? shouldRevealRuntimeEnv(req) : false;

  let supabase = context.supabase;
  if (provider === "chat_policy" || provider === "runtime_env") {
    try {
      supabase = createAdminSupabaseClient();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      );
    }
  }

  let data:
    | { providers: Record<string, Record<string, unknown> | undefined> | null }
    | null = null;
  let error: { message: string } | null = null;
  if (provider === "chat_policy") {
    const picked = await findChatPolicyRow(supabase, context.orgId, context.user.id);
    if (picked.error) {
      error = { message: picked.error.message };
    } else if (picked.row) {
      data = { providers: picked.row.providers };
    }
  } else if (provider === "runtime_env") {
    const picked = await findRuntimeEnvRow(supabase, context.orgId);
    if (picked.error) {
      error = { message: picked.error.message };
    } else if (picked.row) {
      data = { providers: picked.row.providers };
    }
  } else {
    const result = await supabase
      .from("A_iam_auth_settings")
      .select("providers")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    data = result.data;
    if (result.error) error = { message: result.error.message };
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const providers = (data?.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  if (provider === "runtime_env") {
    let raw: Record<string, unknown> = {};
    try {
      raw = decryptManagedEnv(providers.runtime_env || {});
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "RUNTIME_ENV_DECRYPT_FAILED" },
        { status: 500 }
      );
    }
    const deployRaw = ((raw.deploy || raw) as Record<string, unknown>) || {};
    const localRaw = ((raw.local || {}) as Record<string, unknown>) || {};
    if (revealRuntimeEnv) {
      return NextResponse.json({ provider: { deploy: deployRaw, local: localRaw }, masked: false });
    }
    const mask = (value: string) => {
      if (!value) return "";
      if (value.length <= 4) return "*".repeat(value.length);
      return `${value.slice(0, 2)}***${value.slice(-2)}`;
    };
    const maskedDeploy = MANAGED_ENV_KEYS.reduce<Record<string, string>>((acc, key) => {
      acc[key] = mask(String(deployRaw[key] ?? ""));
      return acc;
    }, {});
    const maskedLocal = MANAGED_ENV_KEYS.reduce<Record<string, string>>((acc, key) => {
      acc[key] = mask(String(localRaw[key] ?? ""));
      return acc;
    }, {});
    return NextResponse.json({ provider: { deploy: maskedDeploy, local: maskedLocal }, masked: true });
  }
  return NextResponse.json({ provider: providers[provider] || {} });
}

export async function POST(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json()) as {
    provider?: string;
    values?: Record<string, unknown>;
    commit?: boolean;
    mode?: "deploy" | "local";
  };
  const provider = (body.provider || "").trim();
  if (!provider || !body.values) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (body.commit !== true) {
    return NextResponse.json({ error: "COMMIT_REQUIRED" }, { status: 400 });
  }
  if (provider === "runtime_env" && body.mode && body.mode !== "deploy" && body.mode !== "local") {
    return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
  }

  let supabase = context.supabase;
  if (provider === "chat_policy" || provider === "runtime_env") {
    try {
      supabase = createAdminSupabaseClient();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      );
    }
  }

  let data:
    | { id: string; providers: Record<string, Record<string, unknown> | undefined> | null; user_id?: string }
    | null = null;
  let error: { message: string; code?: string } | null = null;
  if (provider === "chat_policy") {
    const picked = await findChatPolicyRow(supabase, context.orgId, context.user.id);
    if (picked.error) {
      error = { message: picked.error.message };
    } else if (picked.row) {
      data = { id: picked.row.id, providers: picked.row.providers, user_id: picked.row.user_id };
    }
  } else if (provider === "runtime_env") {
    const result = await supabase
      .from("A_iam_auth_settings")
      .select("id, providers, user_id")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (result.error) {
      error = { message: result.error.message, code: (result.error as { code?: string }).code };
    } else if (result.data) {
      data = { id: result.data.id, providers: result.data.providers, user_id: result.data.user_id };
    }
  } else {
    const result = await supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    data = result.data;
    if (result.error) error = { message: result.error.message, code: (result.error as { code?: string }).code };
  }

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    let providers: Record<string, unknown> = { [provider]: body.values };
    if (provider === "runtime_env") {
      const mode = (body as { mode?: "deploy" | "local" }).mode || "deploy";
      const incoming = (body.values || {}) as Record<string, unknown>;
      const filtered = MANAGED_ENV_KEYS.reduce<Record<string, unknown>>((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(incoming, key)) {
          acc[key] = incoming[key] ?? "";
        }
        return acc;
      }, {});
      const payload =
        mode === "local"
          ? { deploy: {}, local: { ...filtered } }
          : { deploy: { ...filtered }, local: {} };
      try {
        providers = { [provider]: encryptManagedEnv(payload) };
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "RUNTIME_ENV_ENCRYPT_FAILED" },
          { status: 500 }
        );
      }
    }
    const { error: insertError } = await supabase.from("A_iam_auth_settings").upsert(
      {
        org_id: context.orgId,
        user_id: context.user.id,
        providers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,user_id" }
    );
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const providers = (data.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  if (provider === "runtime_env") {
    const mode = (body as { mode?: "deploy" | "local" }).mode || "deploy";
    const incoming = (body.values || {}) as Record<string, unknown>;
    const keysPresent = MANAGED_ENV_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(incoming, key));
    const filtered = keysPresent.reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = incoming[key] ?? "";
      return acc;
    }, {});
    let current: Record<string, unknown> = {};
    try {
      current = decryptManagedEnv(providers.runtime_env || {});
    } catch {
      current = {};
    }
    const merged = {
      deploy: { ...((current.deploy || current) as Record<string, unknown>) },
      local: { ...((current.local || {}) as Record<string, unknown>) },
    };
    Object.keys(filtered).forEach((key) => {
      if (mode === "local") {
        merged.local[key] = filtered[key];
      } else {
        merged.deploy[key] = filtered[key];
      }
    });
    let encrypted;
    try {
      encrypted = encryptManagedEnv(merged);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "RUNTIME_ENV_ENCRYPT_FAILED" },
        { status: 500 }
      );
    }
    providers[provider] = encrypted as unknown as Record<string, unknown>;
  } else {
    const current = providers[provider] || {};
    const next = { ...current, ...body.values };
    if (provider === "cafe24") {
      delete (next as Record<string, unknown>).scope;
    }
    providers[provider] = next;
  }

  const { error: updateError } = await supabase
    .from("A_iam_auth_settings")
    .update({ providers, updated_at: new Date().toISOString() })
    .eq("id", data.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
