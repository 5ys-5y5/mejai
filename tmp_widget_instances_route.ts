import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

const INSTANCE_SELECT =
  "id, template_id, public_key, name, is_active, is_public, editable_id, usable_id, created_by, created_at, updated_at, creation_path";
const TEMPLATE_SELECT = "id, name, is_active, is_public, created_by";
const CREATION_PATH_VALUES = ["app_create_chat", "api_widget_instances", "legacy_unknown"] as const;

type ServerContext = Awaited<ReturnType<typeof getServerContext>>;
type CreationPath = (typeof CREATION_PATH_VALUES)[number];

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

function normalizeCreationPath(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return (CREATION_PATH_VALUES as readonly string[]).includes(normalized) ? (normalized as CreationPath) : "";
}

function inferCreationPath(req: NextRequest, explicitValue: unknown): CreationPath {
  const explicit = normalizeCreationPath(explicitValue);
  if (explicit) return explicit;
  const referrer = `${req.headers.get("referer") || ""} ${req.headers.get("origin") || ""}`;
  if (referrer.includes("/app/create") && referrer.includes("tab=chat")) {
    return "app_create_chat";
  }
  return "api_widget_instances";
}

function matchesBooleanFilter(value: boolean | null | undefined, filter: string | null) {
  if (!filter) return true;
  if (filter !== "true" && filter !== "false") return true;
  return Boolean(value) === (filter === "true");
}

function canEditInstance(row: WidgetInstanceRow, userId: string, access: AccessInfo) {
  if (access.isAdmin) return true;
  const editableIds = normalizeIdList(row.editable_id);
  return row.created_by === userId || editableIds.includes(userId);
}

function canReadInstance(row: WidgetInstanceRow, userId: string, access: AccessInfo) {
  if (canEditInstance(row, userId, access)) return true;
  const usableIds = normalizeIdList(row.usable_id);
  return usableIds.includes(userId);
}

function mergeEditableIds(userId: string, access: AccessInfo, value: unknown) {
  const normalized = normalizeIdList(value);
  if (access.isAdmin) {
    return normalized.length > 0 ? normalized : [userId];
  }
  return Array.from(new Set([userId, ...normalized]));
}

function mapInstanceRow(
  row: WidgetInstanceRow,
  templateMap: Map<string, WidgetTemplateRow>,
  permissions?: { canEdit?: boolean; canDelete?: boolean }
) {
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
    can_edit: permissions?.canEdit ?? true,
    can_delete: permissions?.canDelete ?? permissions?.canEdit ?? true,
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

export async function GET(req: NextRequest) {
  const contextResult = await requireContext(req);
  if (!contextResult.ok) return contextResult.response;

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

  const url = new URL(req.url);
  const templateFilter = String(url.searchParams.get("template_id") || "").trim();
  const activeFilter = url.searchParams.get("is_active");

  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select(INSTANCE_SELECT)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const visibleItems = ((data || []) as WidgetInstanceRow[])
    .filter((row) => (access.isAdmin ? true : canReadInstance(row, contextResult.context.user.id, access)))
    .filter((row) => (templateFilter ? row.template_id === templateFilter : true))
    .filter((row) => matchesBooleanFilter(row.is_active, activeFilter));

  const templateMap = await loadTemplateMap(
    supabaseAdmin,
    visibleItems.map((item) => item.template_id)
  );

  return NextResponse.json({
    items: visibleItems.map((item) => {
      const canEdit = canEditInstance(item, contextResult.context.user.id, access);
      return mapInstanceRow(item, templateMap, { canEdit, canDelete: canEdit });
    }),
  });
}

export async function POST(req: NextRequest) {
  const contextResult = await requireContext(req);
  if (!contextResult.ok) return contextResult.response;

  const access = await getAccessInfo(contextResult.context);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const templateId = String(body.template_id || "").trim();
  if (!templateId) {
    return NextResponse.json({ error: "TEMPLATE_REQUIRED" }, { status: 400 });
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

  const template = await loadActiveTemplate(supabaseAdmin, templateId);
  if (!template) {
    return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const name = String(body.name || template.name || "Chat Instance").trim() || template.name || "Chat Instance";
  const isPublic = typeof body.is_public === "boolean" ? body.is_public : true;
  const isActive = typeof body.is_active === "boolean" ? body.is_active : true;
  const editableIds = mergeEditableIds(contextResult.context.user.id, access, body.editable_id);
  const usableIds = normalizeIdList(body.usable_id);
  const creationPath = inferCreationPath(req, body.creation_path);

  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .insert({
      template_id: templateId,
      public_key: makePublicKey(),
      name,
      is_active: isActive,
      is_public: isPublic,
      editable_id: editableIds,
      usable_id: usableIds,
      created_by: contextResult.context.user.id,
      created_at: nowIso,
      updated_at: nowIso,
      creation_path: creationPath,
    })
    .select(INSTANCE_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "INSTANCE_CREATE_FAILED" }, { status: 400 });
  }

  const templateMap = new Map<string, WidgetTemplateRow>([[template.id, template]]);
  return NextResponse.json({
    item: mapInstanceRow(data as WidgetInstanceRow, templateMap, { canEdit: true, canDelete: true }),
  });
}
