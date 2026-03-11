import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WidgetAccess = {
  allowed_domains?: string[] | null;
  allowed_paths?: string[] | null;
};

type TemplateRow = {
  id: string;
  name?: string | null;
  created_by?: string | null;
};

type InstanceRow = {
  id: string;
  public_key: string;
  template_id: string;
  chat_policy?: Record<string, unknown> | null;
};

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function buildSharedChatPolicy(existing: Record<string, unknown> | null, access: WidgetAccess) {
  const base = isPlainObject(existing) ? { ...existing } : {};
  const widget = isPlainObject(base.widget) ? { ...(base.widget as Record<string, unknown>) } : {};
  return {
    ...base,
    widget: {
      ...widget,
      instance_kind: "template_shared",
      access: {
        allowed_domains: access.allowed_domains || [],
        allowed_paths: access.allowed_paths || [],
      },
    },
  };
}

export async function ensureTemplateSharedInstance(
  supabaseAdmin: SupabaseClient,
  template: TemplateRow,
  access: WidgetAccess,
  nowIso = new Date().toISOString()
) {
  const { data: existing } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select("id, public_key, template_id, chat_policy")
    .eq("template_id", template.id)
    .contains("chat_policy", { widget: { instance_kind: "template_shared" } })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const nextPolicy = buildSharedChatPolicy(existing.chat_policy as Record<string, unknown> | null, access);
    await supabaseAdmin
      .from("B_chat_widget_instances")
      .update({
        chat_policy: nextPolicy,
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    return existing as InstanceRow;
  }

  const createdBy = template.created_by ? String(template.created_by) : null;
  const { data: created, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .insert({
      template_id: template.id,
      public_key: makePublicKey(),
      name: template.name || "Widget Template",
      is_active: true,
      chat_policy: buildSharedChatPolicy(null, access),
      is_public: true,
      editable_id: createdBy ? [createdBy] : [],
      usable_id: [],
      created_by: createdBy,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id, public_key, template_id, chat_policy")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "INSTANCE_CREATE_FAILED");
  }

  return created as InstanceRow;
}
