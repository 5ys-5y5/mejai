import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import { readConversationFeatureProvider } from "@/lib/conversation/policyMerge";
import type { WidgetChatPolicyConfig } from "@/lib/conversation/pageFeaturePolicy";

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function readWidgetPolicy(policy: unknown): WidgetChatPolicyConfig | null {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  const widget = (policy as { widget?: unknown }).widget;
  if (!widget || typeof widget !== "object" || Array.isArray(widget)) return null;
  return widget as WidgetChatPolicyConfig;
}

function mergeWidgetTheme(
  baseTheme: Record<string, unknown> | null | undefined,
  policyTheme: WidgetChatPolicyConfig["theme"]
) {
  const theme = baseTheme && typeof baseTheme === "object" ? baseTheme : {};
  if (!policyTheme) return { ...theme };
  return { ...theme, ...policyTheme };
}

function withCors(res: NextResponse, origin?: string | null) {
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return withCors(new NextResponse(null, { status: 204 }), origin);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const publicKey = String(url.searchParams.get("key") || url.searchParams.get("public_key") || "").trim();
  const originHeader = req.headers.get("origin");
  if (!publicKey) {
    return withCors(NextResponse.json({ error: "PUBLIC_KEY_REQUIRED" }, { status: 400 }), originHeader);
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return withCors(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      ),
      originHeader
    );
  }

  const { data: widget, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, is_public")
    .eq("public_key", publicKey)
    .maybeSingle();

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }), originHeader);
  }
  if (!widget) {
    return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
  }
  if (widget.is_public !== true) {
    return withCors(NextResponse.json({ error: "WIDGET_PRIVATE" }, { status: 403 }), originHeader);
  }

  const mergedChatPolicy = readConversationFeatureProvider(widget.chat_policy);
  const widgetPolicy = readWidgetPolicy(mergedChatPolicy);
  if (widgetPolicy?.is_active === false) {
    return withCors(NextResponse.json({ error: "WIDGET_INACTIVE" }, { status: 404 }), originHeader);
  }

  const allowedDomains = widgetPolicy?.allowed_domains || [];
  const originHost = extractHostFromUrl(originHeader || "");
  if (allowedDomains.length > 0 && originHost && !matchAllowedDomain(originHost, allowedDomains)) {
    return withCors(NextResponse.json({ error: "DOMAIN_NOT_ALLOWED" }, { status: 403 }), originHeader);
  }

  const allowedPaths = widgetPolicy?.allowed_paths || [];
  const mergedTheme = mergeWidgetTheme(widget.theme as Record<string, unknown> | null, widgetPolicy?.theme);
  const mergedName = widgetPolicy?.name || widget.name;
  const mergedAgentId = widgetPolicy?.agent_id || widget.agent_id || null;
  const allowedAccounts = normalizeStringArray(
    (widgetPolicy?.theme as Record<string, any>)?.allowed_accounts ?? widgetPolicy?.allowed_accounts
  );

  return withCors(
    NextResponse.json({
      widget: {
        id: widget.id,
        name: mergedName,
        agent_id: mergedAgentId,
        theme: mergedTheme,
        public_key: widget.public_key,
        allowed_domains: allowedDomains,
        allowed_paths: allowedPaths,
        allowed_accounts: allowedAccounts,
        chat_policy: mergedChatPolicy,
      },
    }),
    originHeader
  );
}
