import type { ChatMonitorPreviewTarget, ChatMonitorPreviewTab } from "@/lib/conversation/server/chatMonitoring";
import { buildWidgetEmbedSrc } from "@/components/design-system/widget/WidgetUI.parts";
import { encodeWidgetOverrides } from "@/lib/widgetOverrides";

function buildReadOnlyPreviewOverrides() {
  return {
    chat_policy: {
      interaction: {
        inputSubmit: false,
        inputPlaceholder: "모니터링 전용 미리보기입니다.",
      },
      widget: {
        header: {
          newConversation: false,
        },
      },
    },
  };
}

export function buildConversationPreviewSrc(input: {
  baseUrl: string;
  target: ChatMonitorPreviewTarget;
  visitorId?: string | null;
  sessionId?: string | null;
  tab?: ChatMonitorPreviewTab;
}) {
  const { baseUrl, target, visitorId, sessionId, tab } = input;
  if (!target.can_preview || !baseUrl) return "";

  const overridesParam = encodeWidgetOverrides(buildReadOnlyPreviewOverrides());

  if (target.mode === "instance" && target.instance_id && target.instance_public_key && target.template_id) {
    return buildWidgetEmbedSrc(
      baseUrl,
      {
        instanceId: target.instance_id,
        instancePublicKey: target.instance_public_key,
        templateId: target.template_id,
      },
      String(visitorId || ""),
      String(sessionId || ""),
      overridesParam,
      undefined,
      tab,
      { preview: true }
    );
  }

  if (target.mode === "template" && target.template_id && target.template_public_key) {
    return buildWidgetEmbedSrc(
      baseUrl,
      {
        widgetId: target.template_id,
        widgetPublicKey: target.template_public_key,
      },
      String(visitorId || ""),
      String(sessionId || ""),
      overridesParam,
      undefined,
      tab,
      { preview: true }
    );
  }

  return "";
}
