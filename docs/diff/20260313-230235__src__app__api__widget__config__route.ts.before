import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { decodeWidgetOverrides } from "@/lib/widgetOverrides";
import { normalizeWidgetOverrides } from "@/lib/widgetTemplateMeta";
import {
  filterWidgetOverridesByPolicy,
  resolveWidgetBasePolicy,
  resolveWidgetRuntimeConfig,
  type WidgetInstanceRow,
  type WidgetTemplateRow,
} from "@/lib/widgetRuntimeConfig";
import { ensureTemplateSharedInstance } from "@/lib/widgetSharedInstance";

type TemplateRow = WidgetTemplateRow & {
  public_key?: string | null;
};
type InstanceRow = WidgetInstanceRow;

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
  const publicKey = String(
    url.searchParams.get("public_key") ||
      url.searchParams.get("widget_public_key") ||
      url.searchParams.get("instance_public_key") ||
      url.searchParams.get("key") ||
      ""
  ).trim();
  const instanceId = String(url.searchParams.get("instance_id") || "").trim();
  const templateIdParam = String(url.searchParams.get("template_id") || "").trim();
  const widgetIdParam = String(url.searchParams.get("widget_id") || "").trim();
  const widgetId = widgetIdParam || (!instanceId ? templateIdParam : "");
  const overridesParam = String(url.searchParams.get("ovr") || "").trim();
  const originHeader = req.headers.get("origin");

  if (instanceId) {
    if (!publicKey || !templateIdParam) {
      return withCors(NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 400 }), originHeader);
    }
  } else if (!widgetId || !publicKey) {
    return withCors(NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 400 }), originHeader);
  }
  const overrides = normalizeWidgetOverrides(decodeWidgetOverrides(overridesParam));

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

  let instance: InstanceRow | null = null;
  let template: TemplateRow | null = null;

  if (instanceId) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .select("id, template_id, public_key, name, is_active, chat_policy, is_public")
      .eq("id", instanceId)
      .maybeSingle();
    if (error) {
      return withCors(NextResponse.json({ error: error.message }, { status: 400 }), originHeader);
    }
    if (!data || !data.is_active) {
      return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
    }
    if (String(data.public_key || "") !== publicKey) {
      return withCors(NextResponse.json({ error: "AUTH_FAILED" }, { status: 403 }), originHeader);
    }
    if (String(data.template_id || "") !== templateIdParam) {
      return withCors(NextResponse.json({ error: "TEMPLATE_MISMATCH" }, { status: 400 }), originHeader);
    }
    instance = data as InstanceRow;
  } else if (widgetId) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("id, name, is_active, chat_policy, is_public, created_by, public_key")
      .eq("id", widgetId)
      .maybeSingle();
    if (error) {
      return withCors(NextResponse.json({ error: error.message }, { status: 400 }), originHeader);
    }
    if (!data || !data.is_active) {
      return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
    }
    if (String(data.public_key || "") !== publicKey) {
      return withCors(NextResponse.json({ error: "AUTH_FAILED" }, { status: 403 }), originHeader);
    }
    template = data as TemplateRow;
    try {
      const shared = await ensureTemplateSharedInstance(supabaseAdmin, template);
      instance = {
        id: shared.id,
        template_id: shared.template_id,
        public_key: shared.public_key,
        name: template.name || "Widget Template",
        is_active: true,
        is_public: true,
        chat_policy: shared.chat_policy || null,
      } satisfies InstanceRow;
    } catch (error) {
      return withCors(
        NextResponse.json(
          { error: error instanceof Error ? error.message : "INSTANCE_CREATE_FAILED" },
          { status: 400 }
        ),
        originHeader
      );
    }
  }

  if (!instance) {
    return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
  }

  if (!template) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("id, name, is_active, chat_policy, is_public, created_by, public_key")
      .eq("id", instance.template_id)
      .maybeSingle();
    if (error) {
      return withCors(NextResponse.json({ error: error.message }, { status: 400 }), originHeader);
    }
    if (!data || !data.is_active) {
      return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
    }
    template = data as TemplateRow;
  }

  const basePolicy = resolveWidgetBasePolicy(template, instance);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);

  return withCors(
    NextResponse.json({
      widget: {
        id: instance.id,
        name: resolved.name,
        theme: resolved.theme || {},
        public_key: instance.public_key,
        chat_policy: resolved.chat_policy,
        setup_config: resolved.setup_config,
      },
    }),
    originHeader
  );
}
