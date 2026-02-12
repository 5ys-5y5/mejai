import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

const ORDER_FIELDS = new Set(["last_seen_at", "created_at", "display_name", "sessions_count"]);

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "last_seen_at", ascending: false };
  const [fieldRaw, dirRaw] = orderParam.split(".");
  const field = ORDER_FIELDS.has(fieldRaw) ? fieldRaw : "last_seen_at";
  const ascending = dirRaw === "asc";
  return { field, ascending };
}

function parseCsv(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeQuery(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/,+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);
  const q = normalizeQuery(url.searchParams.get("q"));
  const hasChat = url.searchParams.get("has_chat");
  const hasMemberId = url.searchParams.get("has_member_id");
  const country = String(url.searchParams.get("country") || "").trim();
  const locale = String(url.searchParams.get("locale") || "").trim();
  const tag = String(url.searchParams.get("tag") || "").trim();
  const tags = parseCsv(url.searchParams.get("tags"));
  const lastSeenFrom = String(url.searchParams.get("last_seen_from") || "").trim();
  const lastSeenTo = String(url.searchParams.get("last_seen_to") || "").trim();

  let query = context.supabase
    .from("A_end_users")
    .select("*", { count: "exact" })
    .eq("org_id", context.orgId)
    .is("deleted_at", null)
    .order(field, { ascending })
    .range(offset, offset + limit - 1);

  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `display_name.ilike.${like},email.ilike.${like},phone.ilike.${like},member_id.ilike.${like},external_user_id.ilike.${like}`
    );
  }
  if (hasChat === "true") query = query.eq("has_chat", true);
  if (hasChat === "false") query = query.eq("has_chat", false);
  if (hasMemberId === "true") query = query.not("member_id", "is", null);
  if (hasMemberId === "false") query = query.is("member_id", null);
  if (country) query = query.eq("country", country);
  if (locale) query = query.eq("locale", locale);
  if (tag) query = query.contains("tags", [tag]);
  if (tags.length > 0) query = query.contains("tags", tags);
  if (lastSeenFrom) query = query.gte("last_seen_at", lastSeenFrom);
  if (lastSeenTo) query = query.lte("last_seen_at", lastSeenTo);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
}
