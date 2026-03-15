import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

const INSTANCE_SELECT =
  "id, template_id, public_key, name, is_active, is_public, editable_id, usable_id, created_by, created_at, updated_at, creation_path";
const TEMPLATE_SELECT = "id, name, is_active, is_public, created_by";

type ServerContext = Awaited<ReturnType<typeof getServerContext>>;

type AccessInfo = {
  isAdmin: boolean;
};

type WidgetInstanceRow = {
  id: string;
  template_id: string;
  public_key?: string | null;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  editable_id?: string[] | null;
  usable_id?: string[] | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  creation_path?: string | null;
};

type WidgetTemplateRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  created_by?: string | null;
};

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function canEditInstance(row: WidgetInstanceRow, userId: string, access: AccessInfo) {
  if (access.isAdmin) return true;
  const editableIds = normalizeIdList(row.editable_id);
  return row.created_by === userId || editableIds.includes(userId);
}

function mergeEditableIds(userId: string, access: AccessInfo, value: unknown, fallback: unknown) {
  const source = value === undefined ? fallback : value;
  const normalized = normalizeIdList(source);
  if (access.isAdmin) {
    return normalized.length > 0 ? normalized : [userId];
  }
  return Array.from(new Set([userId, ...normalized]));
}

function mapInstanceRow(row: WidgetInstanceRow, templateMap: Map<string, WidgetTemplateRow>) {
  const template = templateMap.get(row.template_id);
  return {
    ...row,
    name: row.name || "Chat Instance",
    public_key: row.public_key || null,
    editable_id: normalizeIdList(row.editable_id),
    usable_id: normalizeIdList(row.usable_id),
    chat_policy: null,
    creation_path: row.creation_path || null,
    template_name: template?.name || row.template_id,
    template_is_active: template?.is_active ?? true,
    template_is_public: template?.is_public ?? false,
  };
}

async function requireContext(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return { ok: false as const, response: NextResponse.json({ error: context.error }, { status: 401 }) };
  }
  return { ok: true as const, context };
}

async function getAccessInfo(context: ServerContext): Promise<AccessInfo> {
  if ("error" in context) {
    return { isAdmin: false };
  }
  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  return { isAdmin: Boolean(access?.is_admin) };
}

function getAdminSupabase() {
  return createAdminSupabaseClient();
}

async function loadTemplateMap(
  supabaseAdmin: ReturnType<typeof createAdminSupabaseClient>,
  templateIds: string[]
) {
  const uniqueIds = Array.from(new Set(templateIds.map((value) => String(value || "").trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, WidgetTemplateRow>();
  const { data } = await supabaseAdmin.from("B_chat_widgets").select(TEMPLATE_SELECT).in("id", uniqueIds);
  return new Map((data || []).map((row) => [String(row.id), row as WidgetTemplateRow]));
}

async function loadActiveTemplate(
  supabaseAdmin: ReturnType<typeof createAdminSupabaseClient>,
  templateId: string
) {
  const { data } = await supabaseAdmin
    .from("B_chat_widgets")
    .select(TEMPLATE_SELECT)
    .eq("id", templateId)
    .maybeSingle();
  if (!data || data.is_active === false) return null;
  return data as WidgetTemplateRow;
}

async function loadInstance(
  supabaseAdmin: ReturnType<typeof createAdminSupabaseClient>,
  id: string
) {
  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select(INSTANCE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { item: null as WidgetInstanceRow | null, response: NextResponse.json({ error: error.message }, { status: 400 }) };
  }
  if (!data) {
    return { item: null as WidgetInstanceRow | null, response: NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }) };
  }
  return { item: data as WidgetInstanceRow, response: null as NextResponse | null };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contextResult = await requireContext(req);
  if (!contextResult.ok) return contextResult.response;

  const resolvedParams = await params;
  const access = await getAccessInfo(contextResult.context);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getAdminSupabase();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const existingResult = await loadInstance(supabaseAdmin, resolvedParams.id);
  if (existingResult.response) return existingResult.response;
  const existing = existingResult.item;
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!canEditInstance(existing, contextResult.context.user.id, access)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const nextTemplateId = hasOwn(body, "template_id")
    ? String(body.template_id || "").trim()
    : String(existing.template_id || "").trim();
  if (!nextTemplateId) {
    return NextResponse.json({ error: "TEMPLATE_REQUIRED" }, { status: 400 });
  }

  const template = await loadActiveTemplate(supabaseAdmin, nextTemplateId);
  if (!template) {
    return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const name = hasOwn(body, "name")
    ? String(body.name || "").trim() || template.name || existing.name || "Chat Instance"
    : existing.name || template.name || "Chat Instance";
  const editableIds = mergeEditableIds(
    contextResult.context.user.id,
    access,
    hasOwn(body, "editable_id") ? body.editable_id : undefined,
    existing.editable_id
  );
  const usableIds = hasOwn(body, "usable_id") ? normalizeIdList(body.usable_id) : normalizeIdList(existing.usable_id);

  const updates: Record<string, unknown> = {
    template_id: nextTemplateId,
    name,
    is_public: hasOwn(body, "is_public") ? Boolean(body.is_public) : existing.is_public !== false,
    is_active: hasOwn(body, "is_active") ? Boolean(body.is_active) : existing.is_active !== false,
    editable_id: editableIds,
    usable_id: usableIds,
    updated_at: nowIso,
  };

  if (body.rotate_key === true) {
    updates.public_key = makePublicKey();
  }

  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .update(updates)
    .eq("id", resolvedParams.id)
    .select(INSTANCE_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "INSTANCE_UPDATE_FAILED" }, { status: 400 });
  }

  const templateMap = new Map<string, WidgetTemplateRow>([[template.id, template]]);
  return NextResponse.json({ item: mapInstanceRow(data as WidgetInstanceRow, templateMap) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contextResult = await requireContext(req);
  if (!contextResult.ok) return contextResult.response;

  const resolvedParams = await params;
  const access = await getAccessInfo(contextResult.context);

  let supabaseAdmin;
  try {
    supabaseAdmin = getAdminSupabase();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const existingResult = await loadInstance(supabaseAdmin, resolvedParams.id);
  if (existingResult.response) return existingResult.response;
  const existing = existingResult.item;
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!canEditInstance(existing, contextResult.context.user.id, access)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .update({
      is_active: false,
      updated_at: nowIso,
    })
    .eq("id", resolvedParams.id)
    .select(INSTANCE_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "INSTANCE_DELETE_FAILED" }, { status: 400 });
  }

  const templateMap = await loadTemplateMap(supabaseAdmin, [String(data.template_id || "")]);
  return NextResponse.json({ item: mapInstanceRow(data as WidgetInstanceRow, templateMap), ok: true });
}
