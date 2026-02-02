-- Ordered-prefix table rename migration
-- NOTE: Because new names include uppercase letters, identifiers are quoted.

begin;

-- A. IAM
alter table if exists public.organizations rename to "A_iam_organizations";
alter table if exists public.user_access rename to "A_iam_user_access_maps";
alter table if exists public.auth_settings rename to "A_iam_auth_settings";

-- B. BOT
alter table if exists public.agent rename to "B_bot_agents";
alter table if exists public.knowledge_base rename to "B_bot_knowledge_bases";

-- C. MCP governance
alter table if exists public.mcp_tools rename to "C_mcp_tools";
alter table if exists public.mcp_tool_policies rename to "C_mcp_tool_policies";
alter table if exists public.mcp_tool_endpoints rename to "C_mcp_tool_endpoints";
alter table if exists public.mcp_tool_versions rename to "C_mcp_tool_versions";

-- D. Conversation
alter table if exists public.sessions rename to "D_conv_sessions";
alter table if exists public.turns rename to "D_conv_turns";
alter table if exists public.audio_segments rename to "D_conv_audio_segments";

-- E. Ops
alter table if exists public.review_queue rename to "E_ops_review_queue_items";
alter table if exists public.audit_logs rename to "E_ops_actions";

-- F. Audit/observability
alter table if exists public.debug_log rename to "F_audit_turn_specs";
alter table if exists public.event_logs rename to "F_audit_events";
alter table if exists public.mcp_tool_audit_logs rename to "F_audit_mcp_tools";
alter view if exists public.debug_log_view rename to "F_audit_turn_specs_view";

-- G. Commerce
alter table if exists public.product_alias rename to "G_com_product_aliases";
alter table if exists public.product_rule rename to "G_com_product_rules";
alter table if exists public.restock_subscription rename to "G_com_restock_subscriptions";

-- H. Auth
alter table if exists public.otp_verifications rename to "H_auth_otp_verifications";

-- kb_version_metrics -> B_bot_knowledge_bases column integration (example columns)
alter table if exists public."B_bot_knowledge_bases"
  add column if not exists call_count bigint default 0,
  add column if not exists call_duration_sec bigint default 0,
  add column if not exists satisfaction_avg double precision default 0,
  add column if not exists success_rate double precision default 0,
  add column if not exists escalation_rate double precision default 0,
  add column if not exists metrics_updated_at timestamptz;

commit;
