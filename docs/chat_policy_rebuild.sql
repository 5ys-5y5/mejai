-- Widget chat_policy rebuild (defaults + existing merge)
-- Usage: run in database console

CREATE OR REPLACE FUNCTION public.jsonb_deep_merge(a jsonb, b jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN a IS NULL THEN b
      WHEN b IS NULL THEN a
      WHEN jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object'
        THEN (
          SELECT jsonb_object_agg(key, public.jsonb_deep_merge(a->key, b->key))
          FROM (
            SELECT jsonb_object_keys(a) AS key
            UNION
            SELECT jsonb_object_keys(b) AS key
          ) keys
        )
      ELSE b
    END
$$;

WITH defaults AS (
  SELECT '{
    "features": {
      "mcp": {
        "providerSelector": true,
        "actionSelector": true,
        "providers": { "allowlist": [], "denylist": ["cafe24"] },
        "tools": { "allowlist": [], "denylist": [] }
      },
      "adminPanel": {
        "enabled": true,
        "selectionToggle": true,
        "logsToggle": true,
        "messageSelection": true,
        "messageMeta": true,
        "copyConversation": true,
        "copyIssue": true
      },
      "interaction": {
        "quickReplies": true,
        "productCards": true,
        "threePhasePrompt": true,
        "threePhasePromptLabels": {
          "confirmed": "확인한 것",
          "confirming": "확인할 것",
          "next": "그 다음으로 확인할 것"
        },
        "threePhasePromptShowConfirmed": false,
        "threePhasePromptShowConfirming": true,
        "threePhasePromptShowNext": false,
        "threePhasePromptHideLabels": true,
        "inputPlaceholder": "",
        "prefill": false,
        "prefillMessages": [],
        "inputSubmit": true,
        "widgetHeaderAgentAction": true,
        "widgetHeaderNewConversation": true,
        "widgetHeaderClose": true
      },
      "setup": {
        "modelSelector": false,
        "agentSelector": true,
        "llmSelector": true,
        "llms": { "allowlist": [], "denylist": [] },
        "kbSelector": true,
        "kbIds": { "allowlist": [], "denylist": [] },
        "adminKbSelector": true,
        "adminKbIds": { "allowlist": [], "denylist": [] },
        "modeExisting": true,
        "sessionIdSearch": true,
        "modeNew": false,
        "routeSelector": true,
        "routes": { "allowlist": [], "denylist": [] },
        "inlineUserKbInput": false,
        "defaultSetupMode": "new",
        "defaultLlm": "chatgpt"
      },
      "widget": {
        "header": {
          "enabled": true,
          "logo": true,
          "status": true,
          "agentAction": false,
          "newConversation": true,
          "close": true
        },
        "chatPanel": true,
        "historyPanel": true,
        "tabBar": { "enabled": true, "chat": true, "list": true, "policy": true },
        "setupPanel": true
      },
      "visibility": {
        "mcp": { "providerSelector": "user", "actionSelector": "user" },
        "adminPanel": {
          "enabled": "admin",
          "selectionToggle": "admin",
          "logsToggle": "admin",
          "messageSelection": "admin",
          "messageMeta": "admin",
          "copyConversation": "admin",
          "copyIssue": "admin"
        },
        "interaction": {
          "quickReplies": "user",
          "productCards": "user",
          "threePhasePrompt": "user",
          "threePhasePromptShowConfirmed": "user",
          "threePhasePromptShowConfirming": "user",
          "threePhasePromptShowNext": "user",
          "threePhasePromptHideLabels": "user",
          "prefill": "user",
          "inputSubmit": "user",
          "widgetHeaderAgentAction": "user",
          "widgetHeaderNewConversation": "user",
          "widgetHeaderClose": "user"
        },
        "setup": {
          "modelSelector": "user",
          "agentSelector": "user",
          "llmSelector": "user",
          "kbSelector": "user",
          "adminKbSelector": "admin",
          "modeExisting": "admin",
          "sessionIdSearch": "user",
          "modeNew": "admin",
          "routeSelector": "user",
          "inlineUserKbInput": "admin"
        },
        "widget": {
          "header": {
            "enabled": "public",
            "logo": "public",
            "status": "admin",
            "agentAction": "public",
            "newConversation": "public",
            "close": "public"
          },
          "tabBar": {
            "enabled": "public",
            "chat": "public",
            "list": "public",
            "policy": "admin"
          },
          "chatPanel": "public",
          "historyPanel": "public",
          "setupPanel": "public"
        }
      }
    },
    "debug": {
      "outputMode": "used_only",
      "auditBotScope": "runtime_turns_only",
      "includePrincipleHeader": true,
      "includeResponseSchema": true,
      "includeRenderPlan": true,
      "includeQuickReplyRule": true,
      "includeTurnLogs": true,
      "includeTokenUnused": true,
      "includeTurnId": true,
      "sections": {
        "header": {
          "enabled": false,
          "principle": true,
          "expectedLists": true,
          "runtimeModules": true,
          "auditStatus": true
        },
        "turn": {
          "enabled": true,
          "messageText": true,
          "turnId": true,
          "tokenUsed": true,
          "tokenUnused": true,
          "responseSchemaSummary": true,
          "responseSchemaDetail": true,
          "responseSchemaDetailFields": {},
          "renderPlanSummary": true,
          "renderPlanDetail": true,
          "renderPlanDetailFields": {},
          "quickReplyRule": true
        },
        "logs": {
          "enabled": true,
          "issueSummary": true,
          "debug": {
            "enabled": true,
            "prefixJson": true,
            "dedupeGlobalPrefixJson": true,
            "usedOnly": true,
            "prefixJsonSections": {
              "requestMeta": true,
              "resolvedAgent": true,
              "kbResolution": true,
              "modelResolution": true,
              "toolAllowlist": true,
              "toolAllowlistResolvedToolIds": true,
              "toolAllowlistAllowedToolNames": true,
              "toolAllowlistAllowedToolCount": true,
              "toolAllowlistMissingExpectedTools": true,
              "toolAllowlistRequestedToolCount": true,
              "toolAllowlistValidToolCount": true,
              "toolAllowlistProviderSelectionCount": true,
              "toolAllowlistProviderSelections": true,
              "toolAllowlistToolsByIdCount": true,
              "toolAllowlistToolsByProviderCount": true,
              "toolAllowlistResolvedToolCount": true,
              "toolAllowlistQueryError": true,
              "toolAllowlistQueryErrorById": true,
              "toolAllowlistQueryErrorByProvider": true,
              "slotFlow": true,
              "intentScope": true,
              "policyConflicts": true,
              "conflictResolution": true
            }
          },
          "mcp": { "enabled": true, "request": true, "response": true, "includeSuccess": true, "includeError": true },
          "event": { "enabled": true, "payload": true, "allowlist": [] }
        }
      }
    },
    "setup_ui": {
      "order": ["kbSelector","inlineUserKbInput","adminKbSelector","llmSelector","routeSelector","mcpProviderSelector","mcpActionSelector"],
      "labels": {
        "kbSelector": "KB   ",
        "llmSelector": "LLM   ",
        "routeSelector": "Runtime   ",
        "adminKbSelector": "    KB   ",
        "inlineUserKbInput": "    KB   ",
        "mcpActionSelector": "MCP      ",
        "mcpProviderSelector": "MCP         "
      },
      "existing_order": ["sessionIdSearch","agentSelector","versionSelector","conversationMode","sessionSelector"],
      "existing_labels": {
        "modeNew": "     ",
        "modeExisting": "     ",
        "agentSelector": "       ",
        "sessionIdSearch": "   ID      ",
        "sessionSelector": "     ",
        "versionSelector": "     ",
        "conversationMode": "     "
      }
    },
    "widget": {
      "is_active": true,
      "entry_mode": "launcher",
      "embed_view": "both",
      "cfg": { "launcherLabel": "  ", "position": "bottom-right" },
      "allowed_domains": [],
      "allowed_paths": [],
      "launcher": {
        "label": "  ",
        "position": "bottom-right",
        "container": {
          "bottom": "24px",
          "left": "24px",
          "right": "24px",
          "gap": "12px",
          "zIndex": 2147483647
        },
        "size": 56
      },
      "iframe": {
        "width": "360px",
        "height": "560px",
        "bottomOffset": "72px",
        "sideOffset": "0",
        "borderRadius": "16px",
        "boxShadow": "0 20px 40px rgba(15, 23, 42, 0.2)",
        "background": "#fff",
        "layout": "absolute"
      },
      "theme": {
        "greeting": "",
        "input_placeholder": "",
        "launcher_logo_id": "",
        "primary_color": "",
        "launcher_bg": "",
        "allowed_accounts": []
      }
    }
  }'::jsonb AS defaults
),
src AS (
  SELECT id, coalesce(chat_policy, '{}'::jsonb) AS policy FROM public."B_chat_widgets"
)
UPDATE public."B_chat_widgets" w
SET chat_policy =
  (
    public.jsonb_deep_merge(
      (SELECT defaults FROM defaults),
      src.policy
    )
    - 'pages' - 'debug_copy' - 'settings_ui' - 'page_registry'
  )
  || jsonb_build_object(
    'widget',
    jsonb_set(
      (coalesce(src.policy->'widget','{}'::jsonb) - 'allowed_accounts'),
      '{theme,allowed_accounts}',
      coalesce(
        src.policy#>'{widget,theme,allowed_accounts}',
        src.policy#>'{widget,allowed_accounts}',
        '[]'::jsonb
      ),
      true
    )
  )
FROM src
WHERE w.id = src.id;
