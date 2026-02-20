import fs from "fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(path) {
  const env = {};
  const raw = fs.readFileSync(path, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  });
  return env;
}

const env = parseEnvFile(new URL("../.env", import.meta.url));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "";
const cronSecret = env.CRON_SECRET || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE env in .env");
  process.exit(1);
}
if (!cronSecret) {
  console.error("Missing CRON_SECRET in .env");
  process.exit(1);
}

const limit = Math.min(Number(process.env.BACKFILL_LIMIT || 200), 500);
const offset = Math.max(Number(process.env.BACKFILL_OFFSET || 0), 0);
const turnLimit = Math.min(Number(process.env.BACKFILL_TURN_LIMIT || 5000), 20000);
const since = process.env.BACKFILL_SINCE || "";
const until = process.env.BACKFILL_UNTIL || "";
const dryRun = String(process.env.BACKFILL_DRY_RUN || "false").toLowerCase() === "true";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let orgId = null;
const { data: orgRows, error: orgError } = await supabase
  .from("A_iam_organizations")
  .select("id")
  .order("created_at", { ascending: true })
  .limit(1);

if (!orgError && orgRows && orgRows.length > 0) {
  orgId = orgRows[0].id;
} else if (orgError) {
  console.error("ORG_QUERY_ERROR", orgError.message);
}

if (!orgId) {
  const { data: sessionRows, error: sessionOrgError } = await supabase
    .from("D_conv_sessions")
    .select("org_id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (sessionRows && sessionRows.length > 0) {
    orgId = sessionRows[0].org_id;
  } else if (sessionOrgError) {
    console.error("SESSION_ORG_QUERY_ERROR", sessionOrgError.message);
  }
}

if (!orgId) {
  const { data: accessRows, error: accessOrgError } = await supabase
    .from("A_iam_user_access_maps")
    .select("org_id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (accessRows && accessRows.length > 0) {
    orgId = accessRows[0].org_id;
  } else if (accessOrgError) {
    console.error("ACCESS_ORG_QUERY_ERROR", accessOrgError.message);
  }
}

if (!orgId) {
  console.error("ORG_NOT_FOUND");
  process.exit(1);
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function readRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function readString(value) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function readStringArray(value) {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

function normalizeEmail(value) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

function normalizePhone(value) {
  if (!value) return null;
  const digits = normalizePhoneDigits(value);
  return digits || null;
}

function hashIdentity(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function mergeProfiles(base, override) {
  const next = { ...base };
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
  ];
  keys.forEach((key) => {
    const value = override[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      next[key] = value;
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

function extractProfileFromObject(value) {
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

function extractProfileFromMetadata(metadata) {
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

function extractProfileFromEntity(entity) {
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

function buildIdentityCandidates(profile) {
  const identities = [];
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

function buildContentSummary(value, fallback, maxLength = 200) {
  const base = (fallback && String(fallback).trim()) || (value && String(value).trim()) || "";
  if (!base) return null;
  const normalized = base.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildUserSummary(input) {
  const parts = [];
  if (input.intent) parts.push(`intent:${input.intent}`);
  if (input.userText) parts.push(`user:${buildContentSummary(input.userText, null, 120)}`);
  if (input.botText) parts.push(`bot:${buildContentSummary(input.botText, null, 120)}`);
  const summary = parts.join(" | ").trim();
  return summary.length > 260 ? `${summary.slice(0, 259)}…` : summary;
}

async function upsertMemory(input) {
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

async function syncEndUserFromTurn(input) {
  const { context, sessionId, turnId, turnPayload } = input;
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
    const runtimeProfile = extractProfileFromObject(context.runtimeEndUser || null);
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

    if (!endUserId && identities.length > 0) {
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

    if (!isNewUser) {
      const { data: existingUser } = await context.supabase
        .from("A_end_users")
        .select("sessions_count")
        .eq("id", endUserId)
        .maybeSingle();
      existingSessionsCount = typeof existingUser?.sessions_count === "number" ? existingUser.sessions_count : 0;

      const updatePayload = {
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
        console.warn("[end-user-backfill] identity upsert failed", {
          session_id: sessionId,
          turn_id: turnId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const sessionSummary = buildUserSummary({
      intent: readString((turnPayload.bot_context || {})?.intent_name),
      userText: readString(turnPayload.transcript_text),
      botText: readString(turnPayload.final_answer || turnPayload.answer_text),
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
    const assistantContent = readString(turnPayload.final_answer || turnPayload.answer_text);
    const messageRows = [];
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
      .map((ref) => readString(ref?.kb_id))
      .filter((id) => Boolean(id) && isUuidLike(String(id)));
    let kbParentIds = [];
    if (kbIds.length > 0) {
      const { data: kbRows } = await context.supabase
        .from("B_bot_knowledge_bases")
        .select("id, parent_id")
        .in("id", kbIds);
      kbParentIds = (kbRows || [])
        .map((row) => readString(row?.parent_id))
        .filter((id) => Boolean(id));
    }
    const mcpActions = Array.isArray((turnPayload.bot_context || {})?.mcp_actions)
      ? (turnPayload.bot_context || {})?.mcp_actions
      : [];
    let mcpToolIds = [];
    if (mcpActions.length > 0) {
      const { data: mcpRows } = await context.supabase
        .from("C_mcp_tools")
        .select("id, name")
        .in("name", mcpActions)
        .eq("is_active", true);
      mcpToolIds = (mcpRows || []).map((row) => readString(row?.id)).filter((id) => Boolean(id));
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

    const memoryTargets = [
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
  } catch (error) {
    console.warn("[end-user-backfill] sync failed", {
      session_id: sessionId,
      turn_id: turnId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const sinceIso = parseDate(since);
const untilIso = parseDate(until);

let sessionQuery = supabase
  .from("D_conv_sessions")
  .select("id, org_id, created_at")
  .eq("org_id", orgId)
  .order("created_at", { ascending: true })
  .range(offset, offset + limit - 1);

if (sinceIso) sessionQuery = sessionQuery.gte("created_at", sinceIso);
if (untilIso) sessionQuery = sessionQuery.lte("created_at", untilIso);

const { data: sessions, error: sessionError } = await sessionQuery;
if (sessionError) {
  console.error(sessionError.message);
  process.exit(1);
}

const summary = {
  org_id: orgId,
  dry_run: dryRun,
  sessions_scanned: sessions?.length || 0,
  sessions_processed: 0,
  sessions_skipped: 0,
  turns_processed: 0,
  errors: [],
};

const context = { supabase, orgId, runtimeEndUser: null };

for (const session of sessions || []) {
  const sessionId = String(session?.id || "").trim();
  if (!sessionId) {
    summary.sessions_skipped += 1;
    continue;
  }
  const { data: turns, error: turnError } = await supabase
    .from("D_conv_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true })
    .order("created_at", { ascending: true })
    .range(0, Math.max(turnLimit - 1, 0));

  if (turnError) {
    summary.sessions_skipped += 1;
    if (summary.errors.length < 50) {
      summary.errors.push({ session_id: sessionId, error: turnError.message });
    }
    continue;
  }

  summary.sessions_processed += 1;
  if (dryRun) {
    summary.turns_processed += turns?.length || 0;
    continue;
  }

  for (const turn of turns || []) {
    const turnId = String(turn?.id || "").trim();
    if (!turnId) continue;
    await syncEndUserFromTurn({
      context,
      sessionId,
      turnId,
      turnPayload: turn,
    });
    summary.turns_processed += 1;
  }
}

console.log(JSON.stringify(summary, null, 2));
