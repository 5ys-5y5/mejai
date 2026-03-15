import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const TEMPLATE_SHARED_INSTANCE_KIND = "template_shared";
export const SHARED_INSTANCE_MISSING_ERROR = "SHARED_INSTANCE_MISSING";

export type TemplateRow = {
  id: string;
  name?: string | null;
  created_by?: string | null;
  chat_policy?: Record<string, unknown> | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
};

export type InstanceRow = {
  id: string;
  public_key: string;
  template_id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  editable_id?: string[] | null;
  usable_id?: string[] | null;
  chat_policy?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function readInstanceKind(chatPolicy: Record<string, unknown> | null | undefined) {
  if (!isPlainObject(chatPolicy)) return "";
  const widget = chatPolicy.widget;
  if (!isPlainObject(widget)) return "";
  return typeof widget.instance_kind === "string" ? widget.instance_kind.trim() : "";
}

export function isTemplateSharedInstance(row: { chat_policy?: Record<string, unknown> | null }) {
  return readInstanceKind(row.chat_policy) === TEMPLATE_SHARED_INSTANCE_KIND;
}

export function buildSharedChatPolicy(basePolicy: Record<string, unknown> | null | undefined) {
  const base = isPlainObject(basePolicy) ? { ...basePolicy } : {};
  const widget = isPlainObject(base.widget) ? { ...(base.widget as Record<string, unknown>) } : {};
  return {
    ...base,
    widget: {
      ...widget,
      instance_kind: TEMPLATE_SHARED_INSTANCE_KIND,
    },
  };
}

async function selectTemplateSharedInstance(
  supabaseAdmin: SupabaseClient,
  templateId: string
) {
  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select(
      "id, public_key, template_id, name, is_active, is_public, editable_id, usable_id, chat_policy, created_by, created_at, updated_at"
    )
    .eq("template_id", templateId)
    .contains("chat_policy", { widget: { instance_kind: TEMPLATE_SHARED_INSTANCE_KIND } })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data || null) as InstanceRow | null;
}

export async function findTemplateSharedInstance(supabaseAdmin: SupabaseClient, templateId: string) {
  const normalizedTemplateId = String(templateId || "").trim();
  if (!normalizedTemplateId) return null;
  return selectTemplateSharedInstance(supabaseAdmin, normalizedTemplateId);
}

export async function provisionTemplateSharedInstance(
  supabaseAdmin: SupabaseClient,
  template: TemplateRow,
  nowIso = new Date().toISOString()
) {
  const existing = await findTemplateSharedInstance(supabaseAdmin, template.id);
  if (existing?.id) {
    return existing;
  }

  const createdBy = template.created_by ? String(template.created_by) : null;
  const { data: created, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .insert({
      template_id: template.id,
      public_key: makePublicKey(),
      name: template.name || "Widget Template",
      is_active: true,
      chat_policy: buildSharedChatPolicy(template.chat_policy),
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

export async function syncTemplateSharedInstance(
  supabaseAdmin: SupabaseClient,
  template: TemplateRow,
  nowIso = new Date().toISOString()
) {
  const existing = await findTemplateSharedInstance(supabaseAdmin, template.id);
  if (!existing?.id) {
    return null;
  }

  const payload = {
    name: template.name || existing.name || "Widget Template",
    chat_policy: buildSharedChatPolicy(template.chat_policy),
    is_active: true,
    is_public: true,
    updated_at: nowIso,
  };

  const { error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .update(payload)
    .eq("id", existing.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...existing,
    ...payload,
  } satisfies InstanceRow;
}
