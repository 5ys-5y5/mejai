import crypto from "crypto";
import { isUuidLike, normalizePhoneDigits } from "../shared/slotUtils";
import {
  normalizeConfirmedEntity,
  stringifyConfirmedValue,
  type ConfirmedEntity,
} from "../shared/confirmedEntity";
import type { RuntimeContext } from "../shared/runtimeTypes";

export type EndUserSyncContext = Pick<RuntimeContext, "supabase" | "orgId" | "runtimeEndUser">;

type EndUserProfile = {
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  member_id?: string | null;
  external_user_id?: string | null;
  tags?: string[] | null;
  attributes?: Record<string, any> | null;
  locale?: string | null;
  time_zone?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
};

type IdentityCandidate = {
  identity_type: string;
  identity_value: string;
  identity_hash: string;
  is_primary: boolean;
};

type EndUserMemoryEntity = {
  phone?: string | null;
  email?: string | null;
  member_id?: string | null;
  name?: string | null;
  address?: string | null;
  zipcode?: string | null;
  order_id?: string | null;
  [key: string]: string | null | undefined;
};

function nowIso() {
  return new Date().toISOString();
}

const WRITE_LATENCY_THRESHOLD_MS = 1500;

async function insertEndUserAuditEvent(input: {
  context: EndUserSyncContext;
  sessionId: string;
  turnId?: string | null;
  eventType: string;
  payload?: Record<string, any> | null;
  botContext?: Record<string, any> | null;
}) {
  const { context, sessionId, turnId, eventType, payload, botContext } = input;
  try {
    await context.supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: turnId ?? null,
      event_type: eventType,
      payload: payload ?? {},
      created_at: nowIso(),
      bot_context: botContext ?? {},
    });
  } catch (error) {
    console.warn("[runtime/chat_mk2] end user audit event insert failed", {
      eventType,
      session_id: sessionId,
      turn_id: turnId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function readRecord(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

function readString(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

function normalizeEmail(value: string | null) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

function normalizePhone(value: string | null) {
  if (!value) return null;
  const digits = normalizePhoneDigits(value);
  return digits || null;
}

function hashIdentity(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function mergeProfiles(base: EndUserProfile, override: EndUserProfile): EndUserProfile {
  const next: EndUserProfile = { ...base };
  const keys = [
    "display_name",
    "email",
    "phone",
    "member_id",
    "external_user_id",
    "locale",
    "time_zone",
    "city",
    "province",
    "country",
  ] as const;
  type StringKey = (typeof keys)[number];
  keys.forEach((key) => {
    const value = override[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        next[key as StringKey] = trimmed;
      }
    }
  });
  const baseTags = Array.isArray(base.tags) ? base.tags : [];
  const overrideTags = Array.isArray(override.tags) ? override.tags : [];
  const mergedTags = Array.from(new Set([...baseTags, ...overrideTags].map((v) => String(v).trim()).filter(Boolean)));
  if (mergedTags.length > 0) {
    next.tags = mergedTags;
  }
  const baseAttrs = readRecord(base.attributes) || {};
  const overrideAttrs = readRecord(override.attributes) || {};
  const mergedAttrs = { ...baseAttrs, ...overrideAttrs };
  if (Object.keys(mergedAttrs).length > 0) {
    next.attributes = mergedAttrs;
  }
  return next;
}

function extractProfileFromObject(value: unknown): EndUserProfile {
  const obj = readRecord(value);
  if (!obj) return {};
  return {
    display_name: readString(obj.display_name ?? obj.name ?? obj.full_name ?? obj.nickname),
    email: readString(obj.email),
    phone: readString(obj.phone ?? obj.mobile ?? obj.mobile_number ?? obj.phone_number),
    member_id: readString(obj.member_id ?? obj.memberId ?? obj.membership_id),
    external_user_id: readString(obj.external_user_id ?? obj.externalUserId ?? obj.user_id ?? obj.userId ?? obj.id),
    tags: readStringArray(obj.tags),
    attributes: readRecord(obj.attributes) || null,
    locale: readString(obj.locale ?? obj.language),
    time_zone: readString(obj.time_zone ?? obj.timezone),
    city: readString(obj.city),
    province: readString(obj.province ?? obj.region),
    country: readString(obj.country),
  };
}

function extractProfileFromMetadata(metadata: Record<string, any> | null): EndUserProfile {
  if (!metadata) return {};
  const nested =
    readRecord(metadata.end_user) ||
    readRecord(metadata.visitor) ||
    readRecord(metadata.contact) ||
    readRecord(metadata.user) ||
    readRecord(metadata.profile) ||
    readRecord(metadata.customer) ||
    null;
  const profile = extractProfileFromObject(nested);
  const visitorId = readString(
    metadata.visitor_id ??
      metadata.visitorId ??
      metadata.cookie_id ??
      metadata.cookieId ??
      metadata.device_id ??
      metadata.deviceId
  );
  if (visitorId && !profile.external_user_id) {
    profile.external_user_id = visitorId;
  }
  return profile;
}

function extractProfileFromEntity(entity: Record<string, any> | null): EndUserProfile {
  if (!entity) return {};
  return {
    display_name: readString(entity.name ?? entity.customer_name ?? entity.user_name),
    email: readString(entity.email),
    phone: readString(entity.phone ?? entity.mobile ?? entity.mobile_number),
    member_id: readString(entity.member_id ?? entity.memberId),
    locale: readString(entity.locale),
    time_zone: readString(entity.time_zone ?? entity.timezone),
    city: readString(entity.city),
    province: readString(entity.province),
    country: readString(entity.country),
  };
}

function buildIdentityCandidates(profile: EndUserProfile): IdentityCandidate[] {
  const identities: IdentityCandidate[] = [];
  const email = normalizeEmail(profile.email || null);
  const phone = normalizePhone(profile.phone || null);
  const memberId = readString(profile.member_id);
  const externalId = readString(profile.external_user_id);
  if (email) {
    identities.push({
      identity_type: "email",
      identity_value: email,
      identity_hash: hashIdentity(email),
      is_primary: true,
    });
  }
  if (phone) {
    identities.push({
      identity_type: "phone",
      identity_value: phone,
      identity_hash: hashIdentity(phone),
      is_primary: identities.length === 0,
    });
  }
  if (memberId) {
    identities.push({
      identity_type: "member_id",
      identity_value: memberId,
      identity_hash: hashIdentity(memberId),
      is_primary: identities.length === 0,
    });
  }
  if (externalId) {
    identities.push({
      identity_type: "external",
      identity_value: externalId,
      identity_hash: hashIdentity(externalId),
      is_primary: identities.length === 0,
    });
  }
  return identities;
}

function mergeMemoryEntity(base: EndUserMemoryEntity, override: EndUserMemoryEntity) {
  const next: EndUserMemoryEntity = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim();
    }
  });
  return next;
}

function buildMemoryEntityFromRows(rows: Array<Record<string, any>>) {
  const next: EndUserMemoryEntity = {};
  const seen = new Set<string>();
  rows.forEach((row) => {
    const key = readString(row.memory_key);
    if (!key || seen.has(key)) return;
    const content = readString(row.content);
    const valueJson = readRecord(row.value_json) || {};
    const fallback = readString(valueJson.value);
    const value = content || fallback;
    if (!value) return;
    seen.add(key);
    if (key === "phone") next.phone = value;
    if (key === "email") next.email = value;
    if (key === "member_id") next.member_id = value;
    if (key === "name") next.name = value;
    if (key === "address") next.address = value;
    if (key === "zipcode") next.zipcode = value;
    if (key === "order_id") next.order_id = value;
  });
  return next;
}

function buildConfirmedEntityFromRows(rows: Array<Record<string, any>>) {
  const next: EndUserMemoryEntity = {};
  const seen = new Set<string>();
  rows.forEach((row) => {
    const key = readString(row.memory_key);
    if (!key || seen.has(key)) return;
    const content = readString(row.content);
    const valueJson = readRecord(row.value_json) || {};
    const fallback = readString(valueJson.value);
    const value = content || fallback;
    if (!value) return;
    seen.add(key);
    next[key] = value;
  });
  return next;
}

export async function fetchEndUserMemoryEntity(input: {
  context: EndUserSyncContext;
  sessionId: string;
  runtimeEndUser?: Record<string, any> | null;
  entity?: Record<string, any> | null;
}) {
  const { context, sessionId, runtimeEndUser, entity } = input;
  const orgId = String(context.orgId || "").trim();
  if (!orgId) return null;

  let endUserId: string | null = null;
  try {
    const { data: sessionRow } = await context.supabase
      .from("A_end_user_sessions")
      .select("end_user_id")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (sessionRow?.end_user_id) {
      endUserId = String(sessionRow.end_user_id);
    }
  } catch {
    endUserId = null;
  }

  if (!endUserId) {
    const runtimeProfile = extractProfileFromObject(runtimeEndUser || null);
    const entityProfile = extractProfileFromEntity(entity || null);
    const mergedProfile = mergeProfiles(entityProfile, runtimeProfile);
    const identities = buildIdentityCandidates(mergedProfile);
    if (identities.length > 0) {
      const hashes = identities.map((item) => item.identity_hash);
      const { data: identityRows } = await context.supabase
        .from("A_end_user_identities")
        .select("end_user_id, identity_hash, is_primary")
        .eq("org_id", orgId)
        .in("identity_hash", hashes);
      const matched = (identityRows || [])
        .map((row) => ({
          end_user_id: String(row.end_user_id || "").trim(),
          is_primary: Boolean(row.is_primary),
        }))
        .filter((row) => row.end_user_id);
      if (matched.length > 0) {
        matched.sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
        endUserId = matched[0].end_user_id;
      }
    }
  }

  if (!endUserId) return null;

  const { data: memoryRows } = await context.supabase
    .from("A_end_user_memories")
    .select("memory_key, content, value_json, updated_at")
    .eq("org_id", orgId)
    .eq("end_user_id", endUserId)
    .eq("is_active", true)
    .in("memory_key", ["phone", "email", "member_id", "name", "address", "zipcode", "order_id"])
    .order("updated_at", { ascending: false });
  const memoryEntity = buildMemoryEntityFromRows((memoryRows || []) as Array<Record<string, any>>);
  const { data: confirmedRows } = await context.supabase
    .from("A_end_user_memories")
    .select("memory_key, content, value_json, updated_at")
    .eq("org_id", orgId)
    .eq("end_user_id", endUserId)
    .eq("memory_type", "confirmed")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(200);
  const confirmedEntity = buildConfirmedEntityFromRows((confirmedRows || []) as Array<Record<string, any>>);
  const fallbackEntity: EndUserMemoryEntity = {
    phone: normalizePhone(readString((entity || {})?.phone) || null),
    email: normalizeEmail(readString((entity || {})?.email) || null),
    member_id: readString((entity || {})?.member_id),
    name: readString((entity || {})?.name),
    address: readString((entity || {})?.address),
    zipcode: readString((entity || {})?.zipcode),
    order_id: readString((entity || {})?.order_id),
  };
  return mergeMemoryEntity(mergeMemoryEntity(memoryEntity, confirmedEntity), fallbackEntity);
}

function buildContentSummary(value: string | null, fallback?: string | null, maxLength = 200) {
  const base = (fallback && String(fallback).trim()) || (value && String(value).trim()) || "";
  if (!base) return null;
  const normalized = base.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}...`;
}

function buildUserSummary(input: { intent?: string | null; userText?: string | null; botText?: string | null }) {
  const parts: string[] = [];
  if (input.intent) parts.push(`intent:${input.intent}`);
  if (input.userText) parts.push(`user:${buildContentSummary(input.userText, null, 120)}`);
  if (input.botText) parts.push(`bot:${buildContentSummary(input.botText, null, 120)}`);
  const summary = parts.join(" | ").trim();
  return summary.length > 260 ? `${summary.slice(0, 259)}...` : summary;
}

async function upsertMemory(input: {
  context: EndUserSyncContext;
  orgId: string;
  endUserId: string;
  memoryType: string;
  memoryKey: string;
  content: string;
  valueJson: Record<string, any>;
  sourceSessionId: string;
  sourceTurnId: string;
}) {
  const { context, orgId, endUserId, memoryType, memoryKey, content, valueJson, sourceSessionId, sourceTurnId } = input;
  const { data: existing, error: fetchError } = await context.supabase
    .from("A_end_user_memories")
    .select("id")
    .eq("org_id", orgId)
    .eq("end_user_id", endUserId)
    .eq("memory_type", memoryType)
    .eq("memory_key", memoryKey)
    .maybeSingle();
  if (fetchError) return;
  const payload = {
    org_id: orgId,
    end_user_id: endUserId,
    memory_type: memoryType,
    memory_key: memoryKey,
    content,
    value_json: valueJson,
    confidence: null,
    source_type: "runtime",
    source_session_id: sourceSessionId,
    source_turn_id: sourceTurnId,
    ttl_days: null,
    expires_at: null,
    is_active: true,
    updated_at: nowIso(),
  };
  if (existing?.id) {
    await context.supabase.from("A_end_user_memories").update(payload).eq("id", existing.id);
  } else {
    await context.supabase.from("A_end_user_memories").insert({
      ...payload,
      created_at: nowIso(),
    });
  }
}

export async function syncEndUserFromTurn(input: {
  context: EndUserSyncContext;
  sessionId: string;
  turnId: string;
  turnPayload: Record<string, any>;
}) {
  const { context, sessionId, turnId, turnPayload } = input;
  const startedAt = Date.now();
  const orgId = String(context.orgId || "").trim();
  if (!orgId) return;
  try {
    const { data: sessionRow } = await context.supabase
      .from("D_conv_sessions")
      .select("id, org_id, agent_id, channel, started_at, ended_at, satisfaction, outcome, metadata")
      .eq("id", sessionId)
      .maybeSingle();
    if (!sessionRow) return;

    const metadata = readRecord(sessionRow.metadata) || null;
    const metadataProfile = extractProfileFromMetadata(metadata);
    const runtimeProfile = extractProfileFromObject((context as Record<string, any>).runtimeEndUser || null);
    const entity = readRecord((turnPayload.bot_context || {})?.entity) || null;
    const entityProfile = extractProfileFromEntity(entity);

    const mergedProfile = mergeProfiles(mergeProfiles(entityProfile, metadataProfile), runtimeProfile);
    const identities = buildIdentityCandidates(mergedProfile);

    const { data: existingSessionRow } = await context.supabase
      .from("A_end_user_sessions")
      .select("end_user_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    let endUserId = existingSessionRow?.end_user_id ? String(existingSessionRow.end_user_id) : null;
    let matchAttempted = false;
    let matchHit = false;

    if (!endUserId && identities.length > 0) {
      matchAttempted = true;
      const hashes = identities.map((item) => item.identity_hash);
      const { data: identityRows } = await context.supabase
        .from("A_end_user_identities")
        .select("end_user_id, identity_type, identity_hash, is_primary")
        .eq("org_id", orgId)
        .in("identity_hash", hashes);
      const matched = (identityRows || [])
        .map((row) => ({
          end_user_id: String(row.end_user_id || "").trim(),
          is_primary: Boolean(row.is_primary),
        }))
        .filter((row) => row.end_user_id);
      if (matched.length > 0) {
        matched.sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
        endUserId = matched[0].end_user_id;
        matchHit = true;
      }
    }

    const now = nowIso();
    let isNewUser = false;
    let existingSessionsCount = 0;

    if (!endUserId) {
      const insertPayload = {
        org_id: orgId,
        display_name: mergedProfile.display_name || null,
        email: normalizeEmail(mergedProfile.email || null),
        phone: normalizePhone(mergedProfile.phone || null),
        member_id: mergedProfile.member_id || null,
        external_user_id: mergedProfile.external_user_id || null,
        tags: mergedProfile.tags || [],
        attributes: mergedProfile.attributes || {},
        locale: mergedProfile.locale || null,
        time_zone: mergedProfile.time_zone || null,
        city: mergedProfile.city || null,
        province: mergedProfile.province || null,
        country: mergedProfile.country || null,
        first_seen_at: now,
        last_seen_at: now,
        last_session_id: sessionId,
        sessions_count: 1,
        has_chat: true,
        created_at: now,
        updated_at: now,
      };
      const { data: insertedUser } = await context.supabase
        .from("A_end_users")
        .insert(insertPayload)
        .select("id")
        .single();
      endUserId = insertedUser?.id ? String(insertedUser.id) : null;
      isNewUser = true;
    }

    if (!endUserId) return;

    if (matchAttempted) {
      const identityTypes = identities.map((item) => item.identity_type);
      await insertEndUserAuditEvent({
        context,
        sessionId,
        turnId,
        eventType: matchHit ? "END_USER_MATCH_HIT" : "END_USER_MATCH_MISS",
        payload: {
          identity_count: identities.length,
          identity_types: identityTypes,
          matched: matchHit,
        },
        botContext: {
          org_id: orgId,
          end_user_id: endUserId,
          identity_types: identityTypes,
        },
      });
    }

    if (!isNewUser) {
      const { data: existingUser } = await context.supabase
        .from("A_end_users")
        .select("sessions_count")
        .eq("id", endUserId)
        .maybeSingle();
      existingSessionsCount = typeof existingUser?.sessions_count === "number" ? existingUser.sessions_count : 0;

      const updatePayload: Record<string, any> = {
        last_seen_at: now,
        last_session_id: sessionId,
        has_chat: true,
        updated_at: now,
      };
      if (mergedProfile.display_name) updatePayload.display_name = mergedProfile.display_name;
      if (mergedProfile.email) updatePayload.email = normalizeEmail(mergedProfile.email);
      if (mergedProfile.phone) updatePayload.phone = normalizePhone(mergedProfile.phone);
      if (mergedProfile.member_id) updatePayload.member_id = mergedProfile.member_id;
      if (mergedProfile.external_user_id) updatePayload.external_user_id = mergedProfile.external_user_id;
      if (mergedProfile.locale) updatePayload.locale = mergedProfile.locale;
      if (mergedProfile.time_zone) updatePayload.time_zone = mergedProfile.time_zone;
      if (mergedProfile.city) updatePayload.city = mergedProfile.city;
      if (mergedProfile.province) updatePayload.province = mergedProfile.province;
      if (mergedProfile.country) updatePayload.country = mergedProfile.country;
      if (mergedProfile.tags) updatePayload.tags = mergedProfile.tags;
      if (mergedProfile.attributes) updatePayload.attributes = mergedProfile.attributes;

      if (!existingSessionRow?.end_user_id) {
        updatePayload.sessions_count = existingSessionsCount + 1;
      }
      await context.supabase.from("A_end_users").update(updatePayload).eq("id", endUserId);
    }

    if (identities.length > 0) {
      const identityRows = identities.map((identity) => ({
        org_id: orgId,
        end_user_id: endUserId,
        identity_type: identity.identity_type,
        identity_value: identity.identity_value,
        identity_hash: identity.identity_hash,
        is_primary: identity.is_primary,
        created_at: now,
      }));
      try {
        await context.supabase.from("A_end_user_identities").upsert(identityRows, {
          onConflict: "org_id,identity_type,identity_hash",
        });
      } catch (error) {
        console.warn("[runtime/chat_mk2] end user identity upsert failed", {
          session_id: sessionId,
          turn_id: turnId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const userFacingMessage =
      readString((turnPayload.bot_context || {})?.user_facing_message) ||
      readString(turnPayload.final_answer || turnPayload.answer_text);
    const sessionSummary = buildUserSummary({
      intent: readString((turnPayload.bot_context || {})?.intent_name),
      userText: readString(turnPayload.transcript_text),
      botText: userFacingMessage,
    });

    await context.supabase.from("A_end_user_sessions").upsert(
      {
        org_id: orgId,
        end_user_id: endUserId,
        session_id: sessionId,
        channel: readString(sessionRow.channel),
        agent_id: readString(sessionRow.agent_id),
        llm: null,
        mode: null,
        started_at: sessionRow.started_at || null,
        ended_at: sessionRow.ended_at || null,
        outcome: sessionRow.outcome || null,
        satisfaction: sessionRow.satisfaction ?? null,
        summary_text: sessionSummary || null,
        created_at: now,
      },
      { onConflict: "session_id" }
    );

    const userContent = readString(turnPayload.transcript_text);
    const assistantContent = userFacingMessage;
    const messageRows: Array<Record<string, any>> = [];
    if (userContent) {
      messageRows.push({
        org_id: orgId,
        end_user_id: endUserId,
        session_id: sessionId,
        turn_id: turnId,
        role: "user",
        content: userContent,
        content_summary: buildContentSummary(userContent, readString(turnPayload.summary_text), 180),
        content_redacted: null,
        content_lang: null,
        content_tokens: null,
        created_at: now,
      });
    }
    if (assistantContent) {
      messageRows.push({
        org_id: orgId,
        end_user_id: endUserId,
        session_id: sessionId,
        turn_id: turnId,
        role: "assistant",
        content: assistantContent,
        content_summary: buildContentSummary(assistantContent, null, 220),
        content_redacted: null,
        content_lang: null,
        content_tokens: null,
        created_at: now,
      });
    }
    if (messageRows.length > 0) {
      await context.supabase.from("A_end_user_messages").insert(messageRows);
    }

    if (assistantContent) {
      const botContext = readRecord(turnPayload.bot_context) || {};
      await context.supabase.from("A_end_user_response_materials").insert({
        org_id: orgId,
        end_user_id: endUserId,
        session_id: sessionId,
        turn_id: turnId,
        material_type: "runtime_snapshot",
        content_json: {
          kb_references: turnPayload.kb_references || [],
          bot_context: botContext,
        },
        created_at: now,
      });
    }

    if (sessionSummary) {
      await context.supabase.from("A_end_user_summaries").upsert(
        {
          org_id: orgId,
          end_user_id: endUserId,
          summary_text: sessionSummary,
          source_session_id: sessionId,
          updated_at: now,
        },
        { onConflict: "org_id,end_user_id" }
      );
    }

    const kbRefs = Array.isArray(turnPayload.kb_references) ? turnPayload.kb_references : [];
    const kbIds = kbRefs
      .map((ref) => readString((ref as Record<string, any>)?.kb_id))
      .filter((id): id is string => Boolean(id) && isUuidLike(String(id)));
    let kbParentIds: string[] = [];
    if (kbIds.length > 0) {
      const { data: kbRows } = await context.supabase
        .from("B_bot_knowledge_bases")
        .select("id, parent_id")
        .in("id", kbIds);
      kbParentIds = (kbRows || [])
        .map((row) => readString((row as Record<string, any>).parent_id))
        .filter((id): id is string => Boolean(id));
    }
    const mcpActions = Array.isArray((turnPayload.bot_context || {})?.mcp_actions)
      ? ((turnPayload.bot_context || {})?.mcp_actions as string[])
      : [];
    let mcpToolIds: string[] = [];
    if (mcpActions.length > 0) {
      const { data: mcpRows } = await context.supabase
        .from("C_mcp_tools")
        .select("id, name")
        .in("name", mcpActions)
        .eq("is_active", true);
      mcpToolIds = (mcpRows || [])
        .map((row) => readString((row as Record<string, any>).id))
        .filter((id): id is string => Boolean(id));
    }

    const { data: existingResource } = await context.supabase
      .from("A_end_user_session_resources")
      .select("id, mcp_tool_ids, kb_ids, kb_parent_ids, mcp_calls_count, kb_hits_count")
      .eq("org_id", orgId)
      .eq("end_user_id", endUserId)
      .eq("session_id", sessionId)
      .maybeSingle();

    const mergedMcpToolIds = Array.from(
      new Set([...(existingResource?.mcp_tool_ids || []), ...mcpToolIds].filter(Boolean))
    );
    const mergedKbIds = Array.from(new Set([...(existingResource?.kb_ids || []), ...kbIds].filter(Boolean)));
    const mergedKbParentIds = Array.from(
      new Set([...(existingResource?.kb_parent_ids || []), ...kbParentIds].filter(Boolean))
    );

    const resourcePayload = {
      org_id: orgId,
      end_user_id: endUserId,
      session_id: sessionId,
      agent_id: readString(sessionRow.agent_id),
      mcp_tool_ids: mergedMcpToolIds,
      kb_ids: mergedKbIds,
      kb_parent_ids: mergedKbParentIds,
      mcp_calls_count: Number(existingResource?.mcp_calls_count || 0) + mcpActions.length,
      kb_hits_count: Number(existingResource?.kb_hits_count || 0) + kbIds.length,
      updated_at: now,
    };
    if (existingResource?.id) {
      await context.supabase.from("A_end_user_session_resources").update(resourcePayload).eq("id", existingResource.id);
    } else {
      await context.supabase.from("A_end_user_session_resources").insert(resourcePayload);
    }

    const memoryTargets: Array<{ key: string; value: string | null; type: string }> = [
      { key: "phone", value: normalizePhone(mergedProfile.phone || null), type: "profile" },
      { key: "email", value: normalizeEmail(mergedProfile.email || null), type: "profile" },
      { key: "member_id", value: mergedProfile.member_id || null, type: "profile" },
      { key: "name", value: mergedProfile.display_name || null, type: "profile" },
      { key: "address", value: readString(entity?.address), type: "profile" },
      { key: "zipcode", value: readString(entity?.zipcode), type: "profile" },
      {
        key: "order_id",
        value: readString((turnPayload.bot_context || {})?.selected_order_id ?? entity?.order_id),
        type: "order",
      },
    ];
    for (const target of memoryTargets) {
      if (!target.value) continue;
      await upsertMemory({
        context,
        orgId,
        endUserId,
        memoryType: target.type,
        memoryKey: target.key,
        content: target.value,
        valueJson: { value: target.value },
        sourceSessionId: sessionId,
        sourceTurnId: turnId,
      });
    }

    const confirmedEntity = normalizeConfirmedEntity((turnPayload.bot_context || {})?.confirmed_entity) as ConfirmedEntity;
    for (const [key, value] of Object.entries(confirmedEntity)) {
      const content = stringifyConfirmedValue(value);
      if (!content) continue;
      await upsertMemory({
        context,
        orgId,
        endUserId,
        memoryType: "confirmed",
        memoryKey: key,
        content,
        valueJson: { value, source: "confirmed_entity" },
        sourceSessionId: sessionId,
        sourceTurnId: turnId,
      });
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= WRITE_LATENCY_THRESHOLD_MS) {
      await insertEndUserAuditEvent({
        context,
        sessionId,
        turnId,
        eventType: "END_USER_WRITE_LATENCY",
        payload: {
          duration_ms: elapsedMs,
        },
        botContext: {
          org_id: orgId,
          end_user_id: endUserId,
        },
      });
    }
  } catch (error) {
    console.warn("[runtime/chat_mk2] end user sync failed", {
      session_id: sessionId,
      turn_id: turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const __test = {
  normalizeEmail,
  normalizePhone,
  buildIdentityCandidates,
  mergeProfiles,
  extractProfileFromMetadata,
  extractProfileFromObject,
};
