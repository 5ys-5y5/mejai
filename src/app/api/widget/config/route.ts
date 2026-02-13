import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import { fetchWidgetChatPolicy } from "@/lib/widgetChatPolicy";

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
    .select("id, org_id, name, theme, public_key, allowed_domains, is_active")
    .eq("public_key", publicKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }), originHeader);
  }
  if (!widget) {
    return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
  }

  const allowedDomains = Array.isArray(widget.allowed_domains) ? widget.allowed_domains : [];
  const originHost = extractHostFromUrl(originHeader || "");
  if (allowedDomains.length > 0 && originHost && !matchAllowedDomain(originHost, allowedDomains)) {
    return withCors(NextResponse.json({ error: "DOMAIN_NOT_ALLOWED" }, { status: 403 }), originHeader);
  }

  const chatPolicy = await fetchWidgetChatPolicy(supabaseAdmin, String(widget.org_id || "")).catch(() => null);

  return withCors(
    NextResponse.json({
      widget: {
        id: widget.id,
        name: widget.name,
        theme: widget.theme || {},
        public_key: widget.public_key,
        allowed_domains: widget.allowed_domains || [],
        chat_policy: chatPolicy,
      },
    }),
    originHeader
  );
}
